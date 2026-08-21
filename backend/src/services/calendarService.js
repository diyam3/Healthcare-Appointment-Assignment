'use strict';
const { google } = require('googleapis');
const crypto = require('crypto');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '';
const ALGORITHM = 'aes-256-cbc';

// ─── Encryption helpers for refresh tokens ───────────────────────────────────
function encrypt(text) {
  if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length < 32) return text; // skip if key not set
  const key = Buffer.from(ENCRYPTION_KEY.slice(0, 32));
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
  if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length < 32) return text;
  if (!text.includes(':')) return text;
  const [ivHex, encryptedHex] = text.split(':');
  const key = Buffer.from(ENCRYPTION_KEY.slice(0, 32));
  const iv = Buffer.from(ivHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  const decrypted = Buffer.concat([decipher.update(Buffer.from(encryptedHex, 'hex')), decipher.final()]);
  return decrypted.toString('utf8');
}

// ─── OAuth2 client factory ────────────────────────────────────────────────────
function createOAuth2Client() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );
}

/**
 * Get an authorized OAuth2 client for a user.
 * Returns null if user has no stored refresh token.
 */
async function getAuthorizedClient(userId) {
  const user = await prisma.user.findUnique({ where: { id: userId }, select: { googleRefreshToken: true } });
  if (!user || !user.googleRefreshToken) return null;

  const oAuth2Client = createOAuth2Client();
  const refreshToken = decrypt(user.googleRefreshToken);
  oAuth2Client.setCredentials({ refresh_token: refreshToken });
  return oAuth2Client;
}

/**
 * Store encrypted refresh token for a user after OAuth callback.
 */
async function storeRefreshToken(userId, refreshToken) {
  const encrypted = encrypt(refreshToken);
  await prisma.user.update({ where: { id: userId }, data: { googleRefreshToken: encrypted } });
}

/**
 * Generate the Google OAuth authorization URL.
 */
function getAuthUrl() {
  const oAuth2Client = createOAuth2Client();
  return oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: ['https://www.googleapis.com/auth/calendar.events'],
  });
}

/**
 * Exchange auth code for tokens and store the refresh token.
 */
async function handleOAuthCallback(code, userId) {
  const oAuth2Client = createOAuth2Client();
  const { tokens } = await oAuth2Client.getToken(code);
  if (tokens.refresh_token) {
    await storeRefreshToken(userId, tokens.refresh_token);
  }
  return tokens;
}

// ─── Calendar event helpers ───────────────────────────────────────────────────

/**
 * Create a Google Calendar event for both patient and doctor.
 * Skips silently if either user has no refresh token.
 */
async function createCalendarEvent(appointment, patient, doctor) {
  const doctorRecord = await prisma.doctor.findUnique({
    where: { id: appointment.doctorId },
    select: { userId: true, name: true },
  });

  const slotStart = new Date(appointment.slotStartTime);
  const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000); // default 30 min

  const event = {
    summary: `Medical Appointment with Dr. ${doctorRecord ? doctorRecord.name : 'Doctor'}`,
    description: `Appointment ID: ${appointment.id}`,
    start: { dateTime: slotStart.toISOString(), timeZone: 'UTC' },
    end: { dateTime: slotEnd.toISOString(), timeZone: 'UTC' },
  };

  let googleEventId = null;

  // Create on patient's calendar
  try {
    const patientAuth = await getAuthorizedClient(patient.id);
    if (patientAuth) {
      const calendar = google.calendar({ version: 'v3', auth: patientAuth });
      const result = await calendar.events.insert({ calendarId: 'primary', requestBody: event });
      googleEventId = result.data.id;
    }
  } catch (err) {
    console.warn(`Calendar event creation failed for patient ${patient.id}:`, err.message);
  }

  // Create on doctor's calendar
  try {
    if (doctorRecord) {
      const doctorAuth = await getAuthorizedClient(doctorRecord.userId);
      if (doctorAuth) {
        const calendar = google.calendar({ version: 'v3', auth: doctorAuth });
        await calendar.events.insert({ calendarId: 'primary', requestBody: event });
      }
    }
  } catch (err) {
    console.warn(`Calendar event creation failed for doctor:`, err.message);
  }

  // Persist googleEventId on appointment
  if (googleEventId) {
    await prisma.appointment.update({ where: { id: appointment.id }, data: { googleEventId } });
  }
}

/**
 * Update the calendar event when an appointment is rescheduled.
 */
async function updateCalendarEvent(appointment, patient) {
  if (!appointment.googleEventId) return;

  const slotStart = new Date(appointment.slotStartTime);
  const slotEnd = new Date(slotStart.getTime() + 30 * 60 * 1000);

  try {
    const patientAuth = await getAuthorizedClient(patient.id);
    if (!patientAuth) return;
    const calendar = google.calendar({ version: 'v3', auth: patientAuth });
    await calendar.events.patch({
      calendarId: 'primary',
      eventId: appointment.googleEventId,
      requestBody: {
        start: { dateTime: slotStart.toISOString(), timeZone: 'UTC' },
        end: { dateTime: slotEnd.toISOString(), timeZone: 'UTC' },
      },
    });
  } catch (err) {
    console.warn('Calendar event update failed:', err.message);
  }
}

/**
 * Delete the calendar event on cancellation.
 */
async function deleteCalendarEvent(appointment) {
  if (!appointment.googleEventId) return;

  try {
    const patientAuth = await getAuthorizedClient(appointment.patientId);
    if (!patientAuth) return;
    const calendar = google.calendar({ version: 'v3', auth: patientAuth });
    await calendar.events.delete({ calendarId: 'primary', eventId: appointment.googleEventId });
  } catch (err) {
    console.warn('Calendar event deletion failed:', err.message);
  }
}

module.exports = { createCalendarEvent, updateCalendarEvent, deleteCalendarEvent, getAuthUrl, handleOAuthCallback, storeRefreshToken };
