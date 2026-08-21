'use strict';
const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');
const { getAvailableSlots } = require('../services/slotService');

const router = express.Router();
const prisma = new PrismaClient();

const HOLD_MINUTES = parseInt(process.env.SLOT_HOLD_MINUTES || '8', 10);

// ─── GET /api/appointments/my — patient's own appointments ───────────────────
// NOTE: must be declared before /:id to avoid route shadowing
router.get('/my', authenticateToken, requireRole('patient'), async (req, res) => {
  try {
    const appointments = await prisma.appointment.findMany({
      where: { patientId: req.user.userId },
      include: { doctor: { select: { id: true, name: true, specialization: true } } },
      orderBy: { slotStartTime: 'desc' },
    });
    return res.json(appointments);
  } catch (err) {
    console.error('Get patient appointments error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/appointments/doctor/mine — doctor's own appointments ────────────
router.get('/doctor/mine', authenticateToken, requireRole('doctor'), async (req, res) => {
  try {
    const doctorRecord = await prisma.doctor.findFirst({ where: { userId: req.user.userId } });
    if (!doctorRecord) return res.status(404).json({ error: 'Doctor profile not found' });

    const appointments = await prisma.appointment.findMany({
      where: { doctorId: doctorRecord.id, status: { in: ['confirmed', 'completed'] } },
      include: { patient: { select: { id: true, name: true, email: true } } },
      orderBy: { slotStartTime: 'asc' },
    });
    return res.json(appointments);
  } catch (err) {
    console.error('Get doctor appointments error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── GET /api/doctors/:id/slots?date= ────────────────────────────────────────
router.get(
  '/doctors/:id/slots',
  [query('date').isISO8601().withMessage('date is required in YYYY-MM-DD format')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const { id: doctorId } = req.params;
    const { date } = req.query;

    try {
      const slots = await getAvailableSlots(doctorId, date);
      return res.json({ doctorId, date, slots: slots.map((s) => s.toISOString()) });
    } catch (err) {
      console.error('Get slots error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ─── POST /api/appointments/hold ─────────────────────────────────────────────
// Creates a temporary slot hold. Uses a DB-level transaction with a unique
// constraint on (doctorId, slotStartTime) to prevent double-booking.
router.post(
  '/hold',
  authenticateToken,
  requireRole('patient'),
  [
    body('doctorId').notEmpty().withMessage('doctorId is required'),
    body('slotStartTime').isISO8601().withMessage('slotStartTime must be ISO 8601'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const { doctorId, slotStartTime } = req.body;
    const patientId = req.user.userId;
    const slotTime = new Date(slotStartTime);
    const expiresAt = new Date(Date.now() + HOLD_MINUTES * 60 * 1000);

    try {
      // Use a transaction + raw SELECT FOR UPDATE to serialize concurrent hold attempts
      const hold = await prisma.$transaction(async (tx) => {
        // Lock any existing hold/appointment for this slot
        await tx.$executeRaw`
          SELECT id FROM slot_holds
          WHERE doctor_id = ${doctorId} AND slot_start_time = ${slotTime}
          FOR UPDATE
        `;

        // Check for existing active hold
        const existingHold = await tx.slotHold.findFirst({
          where: {
            doctorId,
            slotStartTime: slotTime,
            expiresAt: { gt: new Date() },
          },
        });
        if (existingHold) {
          const err = new Error('Slot already held');
          err.statusCode = 409;
          throw err;
        }

        // Check for existing appointment
        const existingAppt = await tx.appointment.findFirst({
          where: {
            doctorId,
            slotStartTime: slotTime,
            status: { in: ['held', 'confirmed', 'completed'] },
          },
        });
        if (existingAppt) {
          const err = new Error('Slot already booked');
          err.statusCode = 409;
          throw err;
        }

        return tx.slotHold.create({
          data: { doctorId, patientId, slotStartTime: slotTime, expiresAt, status: 'active' },
        });
      });

      return res.status(201).json({ hold, expiresAt: expiresAt.toISOString(), holdMinutes: HOLD_MINUTES });
    } catch (err) {
      if (err.statusCode === 409 || err.code === 'P2002') {
        return res.status(409).json({ error: 'Conflict', message: 'Slot is no longer available, please pick another' });
      }
      console.error('Hold slot error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ─── POST /api/appointments/:id/confirm ──────────────────────────────────────
// Atomically converts a valid hold into a confirmed appointment.
router.post(
  '/:id/confirm',
  authenticateToken,
  requireRole('patient'),
  [body('symptoms').trim().notEmpty().withMessage('Symptoms are required')],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const { id: holdId } = req.params;
    const { symptoms } = req.body;
    const patientId = req.user.userId;

    try {
      const appointment = await prisma.$transaction(async (tx) => {
        // Lock the hold row
        const holds = await tx.$queryRaw`
          SELECT id, doctor_id, patient_id, slot_start_time, expires_at
          FROM slot_holds
          WHERE id = ${holdId}
          FOR UPDATE
        `;

        if (!holds || holds.length === 0) {
          const err = new Error('Hold not found or already confirmed');
          err.statusCode = 404;
          throw err;
        }

        const hold = holds[0];

        if (hold.patient_id !== patientId) {
          const err = new Error('This hold belongs to a different patient');
          err.statusCode = 403;
          throw err;
        }

        if (new Date(hold.expires_at) <= new Date()) {
          // Clean up expired hold
          await tx.slotHold.deleteMany({ where: { id: holdId } });
          const err = new Error('Hold has expired, please select a new slot');
          err.statusCode = 410;
          throw err;
        }

        // Delete the hold
        await tx.slotHold.deleteMany({ where: { id: holdId } });

        // Create the appointment
        return tx.appointment.create({
          data: {
            doctorId: hold.doctor_id,
            patientId: hold.patient_id,
            slotStartTime: new Date(hold.slot_start_time),
            status: 'confirmed',
            symptomsText: symptoms,
          },
          include: {
            doctor: { select: { id: true, name: true, specialization: true } },
            patient: { select: { id: true, name: true, email: true } },
          },
        });
      });

      // Generate pre-visit summary (non-blocking — never fail the booking)
      let preVisitSummary = null;
      try {
        const { generatePreVisitSummary } = require('../services/llmService');
        preVisitSummary = await generatePreVisitSummary(symptoms);
        await prisma.appointment.update({
          where: { id: appointment.id },
          data: {
            preVisitSummary,
            urgencyLevel: preVisitSummary.urgency_level || null,
          },
        });
      } catch (llmErr) {
        console.warn('LLM pre-visit summary failed:', llmErr.message);
        preVisitSummary = { status: 'llm_failed', raw: symptoms };
        await prisma.appointment.update({
          where: { id: appointment.id },
          data: { preVisitSummary },
        });
      }

      // Enqueue confirmation email + calendar event (non-blocking)
      try {
        const { enqueueBookingConfirmation } = require('../services/emailService');
        await enqueueBookingConfirmation(appointment.patient, appointment.doctor, appointment);
      } catch (e) {
        console.warn('Email enqueue failed:', e.message);
      }
      try {
        const { createCalendarEvent } = require('../services/calendarService');
        await createCalendarEvent(appointment, appointment.patient, appointment.doctor);
      } catch (e) {
        console.warn('Calendar event creation failed:', e.message);
      }

      return res.status(201).json({ appointment: { ...appointment, preVisitSummary } });
    } catch (err) {
      if (err.statusCode) {
        return res.status(err.statusCode).json({ error: err.message });
      }
      if (err.code === 'P2002') {
        return res.status(409).json({ error: 'Slot is no longer available, please pick another' });
      }
      console.error('Confirm appointment error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ─── POST /api/appointments/:id/cancel ───────────────────────────────────────
router.post('/:id/cancel', authenticateToken, requireRole('patient', 'doctor', 'admin'), async (req, res) => {
  const { id } = req.params;
  try {
    const appt = await prisma.appointment.findUnique({
      where: { id },
      include: {
        patient: { select: { id: true, name: true, email: true } },
        doctor: { select: { id: true, name: true } },
      },
    });
    if (!appt) return res.status(404).json({ error: 'Not Found', message: 'Appointment not found' });

    const cancelStatus =
      req.user.role === 'patient' ? 'cancelled_by_patient' : 'cancelled_by_leave';

    await prisma.appointment.update({ where: { id }, data: { status: cancelStatus } });

    // Delete calendar event (non-blocking)
    try {
      const { deleteCalendarEvent } = require('../services/calendarService');
      await deleteCalendarEvent(appt);
    } catch (e) {
      console.warn('Calendar delete failed:', e.message);
    }

    // Enqueue cancellation email (non-blocking)
    try {
      const { enqueueCancellationEmail } = require('../services/emailService');
      const rebookingLink = `${process.env.APP_BASE_URL || 'http://localhost:3001'}/patient/doctors`;
      await enqueueCancellationEmail(appt.patient, appt.doctor, appt, 'Cancelled by request', rebookingLink);
    } catch (e) {
      console.warn('Cancellation email enqueue failed:', e.message);
    }

    return res.json({ message: 'Appointment cancelled successfully' });
  } catch (err) {
    console.error('Cancel appointment error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// ─── POST /api/appointments/:id/notes ────────────────────────────────────────
// Doctor submits clinical notes + prescription after the visit
router.post(
  '/:id/notes',
  authenticateToken,
  requireRole('doctor'),
  [
    body('clinicalNotes').trim().notEmpty().withMessage('Clinical notes are required'),
    body('prescription').optional().isArray().withMessage('Prescription must be an array'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const { id } = req.params;
    const { clinicalNotes, prescription = [] } = req.body;

    try {
      const appt = await prisma.appointment.findUnique({
        where: { id },
        include: { patient: { select: { id: true, name: true, email: true } } },
      });
      if (!appt) return res.status(404).json({ error: 'Not Found', message: 'Appointment not found' });

      // Generate post-visit summary (non-blocking)
      let postVisitSummary = null;
      try {
        const { generatePostVisitSummary } = require('../services/llmService');
        postVisitSummary = await generatePostVisitSummary(clinicalNotes);
      } catch (llmErr) {
        console.warn('LLM post-visit summary failed:', llmErr.message);
        postVisitSummary = { status: 'llm_failed', raw: clinicalNotes };
      }

      // Save notes, prescription JSON, post-visit summary, mark completed
      const updated = await prisma.appointment.update({
        where: { id },
        data: {
          clinicalNotes,
          prescription,
          postVisitSummary,
          status: 'completed',
        },
      });

      // Create prescription rows
      if (prescription.length > 0) {
        await prisma.prescription.createMany({
          data: prescription.map((p) => ({
            appointmentId: id,
            drugName: p.drugName || p.drug_name || '',
            dosage: p.dosage || '',
            frequency: p.frequency || '',
            durationDays: Number(p.durationDays || p.duration_days || 1),
          })),
          skipDuplicates: true,
        });
      }

      // Enqueue medication reminders (non-blocking)
      try {
        const { enqueueMedicationReminders } = require('../services/emailService');
        await enqueueMedicationReminders(appt.patient, prescription, id);
      } catch (e) {
        console.warn('Medication reminder enqueue failed:', e.message);
      }

      return res.json({ appointment: updated, postVisitSummary });
    } catch (err) {
      console.error('Submit notes error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// ─── GET /api/appointments/:id/summary ───────────────────────────────────────
router.get('/:id/summary', authenticateToken, async (req, res) => {
  const { id } = req.params;
  try {
    const appt = await prisma.appointment.findUnique({
      where: { id },
      include: {
        doctor: { select: { id: true, name: true, specialization: true } },
        patient: { select: { id: true, name: true, email: true } },
        prescriptions: true,
      },
    });
    if (!appt) return res.status(404).json({ error: 'Not Found', message: 'Appointment not found' });

    // Only the patient or doctor involved (or admin) may view
    const { userId, role } = req.user;
    const isPatient = appt.patientId === userId;
    const isDoctor = appt.doctor && appt.doctorId === userId; // doctorId is doctor table id, need user id
    if (role !== 'admin' && !isPatient) {
      // Doctor check: find if this user owns the doctor record
      const { PrismaClient: PC } = require('@prisma/client');
      const p2 = new PC();
      const doctorRecord = await p2.doctor.findFirst({ where: { userId, id: appt.doctorId } });
      await p2.$disconnect();
      if (!doctorRecord) {
        return res.status(403).json({ error: 'Forbidden', message: 'Access denied' });
      }
    }

    return res.json(appt);
  } catch (err) {
    console.error('Get summary error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
