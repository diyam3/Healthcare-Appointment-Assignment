'use strict';
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const DAY_NAMES = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];

/**
 * Generate all slot start times for a doctor on a given date.
 * @param {object} workingHours - JSON from doctor record
 * @param {number} slotDurationMin - slot length in minutes
 * @param {Date} date - the target date (UTC midnight)
 * @returns {Date[]} array of slot start times
 */
function generateSlots(workingHours, slotDurationMin, date) {
  const dayName = DAY_NAMES[date.getUTCDay()];
  const hours = workingHours[dayName];
  if (!hours) return [];

  const [startH, startM] = hours.start.split(':').map(Number);
  const [endH, endM] = hours.end.split(':').map(Number);

  const slots = [];
  let current = new Date(date);
  current.setUTCHours(startH, startM, 0, 0);
  const end = new Date(date);
  end.setUTCHours(endH, endM, 0, 0);

  while (current < end) {
    const slotEnd = new Date(current.getTime() + slotDurationMin * 60 * 1000);
    if (slotEnd <= end) {
      slots.push(new Date(current));
    }
    current = slotEnd;
  }
  return slots;
}

/**
 * Get available slots for a doctor on a specific date.
 * Excludes slots that are held (non-expired), booked, or on a leave day.
 * @param {string} doctorId
 * @param {string|Date} dateInput - ISO date string or Date object
 * @returns {Promise<Date[]>} available slot start times
 */
async function getAvailableSlots(doctorId, dateInput) {
  const date = new Date(dateInput);
  date.setUTCHours(0, 0, 0, 0);
  const dateEnd = new Date(dateInput);
  dateEnd.setUTCHours(23, 59, 59, 999);

  // Load doctor
  const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } });
  if (!doctor || !doctor.isActive) return [];

  // Check leave
  const onLeave = await prisma.doctorLeave.findFirst({
    where: { doctorId, leaveDate: { gte: date, lte: dateEnd } },
  });
  if (onLeave) return [];

  // Generate all possible slots
  const allSlots = generateSlots(doctor.workingHours, doctor.slotDurationMin, date);
  if (allSlots.length === 0) return [];

  const now = new Date();

  // Fetch active holds (non-expired)
  const holds = await prisma.slotHold.findMany({
    where: { doctorId, slotStartTime: { gte: date, lte: dateEnd }, expiresAt: { gt: now } },
    select: { slotStartTime: true },
  });

  // Fetch confirmed/held appointments
  const appointments = await prisma.appointment.findMany({
    where: {
      doctorId,
      slotStartTime: { gte: date, lte: dateEnd },
      status: { in: ['held', 'confirmed', 'completed'] },
    },
    select: { slotStartTime: true },
  });

  // Build set of occupied times (ISO strings for easy comparison)
  const occupied = new Set([
    ...holds.map((h) => h.slotStartTime.toISOString()),
    ...appointments.map((a) => a.slotStartTime.toISOString()),
  ]);

  return allSlots.filter((s) => !occupied.has(s.toISOString()));
}

module.exports = { getAvailableSlots, generateSlots };
