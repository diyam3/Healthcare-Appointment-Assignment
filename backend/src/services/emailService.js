'use strict';
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Get the email queue lazily to avoid circular dependency issues at startup.
 */
function getEmailQueue() {
  const { emailQueue } = require('../jobs/queues');
  return emailQueue;
}

/**
 * Log a notification attempt to the DB.
 */
async function logNotification(userId, type, status, errorMessage = null) {
  try {
    await prisma.notificationLog.create({
      data: { userId, channel: 'email', type, status, errorMessage, sentAt: status === 'sent' ? new Date() : null },
    });
  } catch (err) {
    console.error('Failed to log notification:', err.message);
  }
}

/**
 * Enqueue a booking confirmation email for patient and doctor.
 */
async function enqueueBookingConfirmation(patient, doctor, appointment) {
  const queue = getEmailQueue();
  const jobData = {
    type: 'booking_confirmation',
    to: patient.email,
    subject: 'Appointment Confirmed',
    html: `<p>Hi ${patient.name},</p><p>Your appointment with Dr. ${doctor.name} is confirmed for <strong>${new Date(appointment.slotStartTime).toUTCString()}</strong>.</p><p>Appointment ID: ${appointment.id}</p>`,
    recipientId: patient.id,
  };
  await queue.add('email', jobData, { attempts: 3, backoff: { type: 'exponential', delay: 60000 } });
  await logNotification(patient.id, 'booking_confirmation', 'pending');
}

/**
 * Enqueue a cancellation email for patient.
 */
async function enqueueCancellationEmail(patient, doctor, appointment, reason, rebookingLink) {
  const queue = getEmailQueue();
  const jobData = {
    type: 'cancellation',
    to: patient.email,
    subject: 'Appointment Cancelled',
    html: `<p>Hi ${patient.name},</p><p>Your appointment with Dr. ${doctor.name} on <strong>${new Date(appointment.slotStartTime).toUTCString()}</strong> has been cancelled.</p><p>Reason: ${reason}</p><p><a href="${rebookingLink}">Rebook an appointment</a></p>`,
    recipientId: patient.id,
  };
  await queue.add('email', jobData, { attempts: 3, backoff: { type: 'exponential', delay: 60000 } });
  await logNotification(patient.id, 'cancellation', 'pending');
}

/**
 * Enqueue a reminder email before the appointment.
 */
async function enqueueReminderEmail(patient, doctor, appointment) {
  const queue = getEmailQueue();
  const jobData = {
    type: 'reminder',
    to: patient.email,
    subject: 'Appointment Reminder',
    html: `<p>Hi ${patient.name},</p><p>Reminder: You have an appointment with Dr. ${doctor.name} at <strong>${new Date(appointment.slotStartTime).toUTCString()}</strong>.</p>`,
    recipientId: patient.id,
  };
  await queue.add('email', jobData, { attempts: 3, backoff: { type: 'exponential', delay: 60000 } });
  await logNotification(patient.id, 'reminder', 'pending');
}

/**
 * Enqueue medication reminder emails based on prescription frequency.
 */
async function enqueueMedicationReminders(patient, prescriptions, appointmentId) {
  if (!prescriptions || prescriptions.length === 0) return;
  const queue = getEmailQueue();

  for (const rx of prescriptions) {
    const drugName = rx.drugName || rx.drug_name || 'medication';
    const dosage = rx.dosage || '';
    const frequency = rx.frequency || 'as directed';
    const durationDays = Number(rx.durationDays || rx.duration_days || 1);

    // Parse frequency to determine how many reminders per day
    // e.g. "twice daily" → 2, "once daily" → 1, "three times daily" → 3
    let timesPerDay = 1;
    if (/twice|2.*day|bid/i.test(frequency)) timesPerDay = 2;
    else if (/three.*time|tid|3.*day/i.test(frequency)) timesPerDay = 3;
    else if (/four.*time|qid|4.*day/i.test(frequency)) timesPerDay = 4;

    const intervalHours = Math.floor(24 / timesPerDay);
    const now = new Date();

    for (let day = 0; day < durationDays; day++) {
      for (let dose = 0; dose < timesPerDay; dose++) {
        const reminderTime = new Date(now.getTime() + (day * 24 + dose * intervalHours) * 3600000);
        const delay = reminderTime.getTime() - Date.now();
        if (delay < 0) continue;

        const jobData = {
          type: 'medication_reminder',
          to: patient.email,
          subject: `Medication Reminder: ${drugName}`,
          html: `<p>Hi ${patient.name},</p><p>Time to take your medication: <strong>${drugName}</strong> ${dosage} (${frequency}).</p>`,
          recipientId: patient.id,
        };
        await queue.add('email', jobData, {
          delay,
          attempts: 3,
          backoff: { type: 'exponential', delay: 60000 },
        });
        await logNotification(patient.id, 'medication_reminder', 'pending');
      }
    }
  }
}

module.exports = {
  enqueueBookingConfirmation,
  enqueueCancellationEmail,
  enqueueReminderEmail,
  enqueueMedicationReminders,
  logNotification,
};
