'use strict';
const express = require('express');
const { body, query, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

const router = express.Router();
const prisma = new PrismaClient();

// GET /api/doctors?specialization=&date=  (public)
router.get(
  '/',
  [
    query('specialization').optional().trim(),
    query('date').optional().isISO8601().withMessage('date must be YYYY-MM-DD'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const { specialization, date } = req.query;
    try {
      let doctorIdsOnLeave = [];
      if (date) {
        const day = new Date(date);
        day.setUTCHours(0, 0, 0, 0);
        const dayEnd = new Date(date);
        dayEnd.setUTCHours(23, 59, 59, 999);
        const leaves = await prisma.doctorLeave.findMany({
          where: { leaveDate: { gte: day, lte: dayEnd } },
          select: { doctorId: true },
        });
        doctorIdsOnLeave = leaves.map((l) => l.doctorId);
      }

      const where = {
        isActive: true,
        ...(specialization && { specialization: { contains: specialization, mode: 'insensitive' } }),
        ...(doctorIdsOnLeave.length > 0 && { id: { notIn: doctorIdsOnLeave } }),
      };

      const doctors = await prisma.doctor.findMany({
        where,
        include: { user: { select: { id: true, name: true, email: true } } },
        orderBy: { name: 'asc' },
      });
      return res.json(doctors);
    } catch (err) {
      console.error('Search doctors error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// POST /api/doctors/:id/leave  (admin or doctor)
router.post(
  '/:id/leave',
  authenticateToken,
  requireRole('admin', 'doctor'),
  [
    body('leaveDate').isISO8601().withMessage('leaveDate must be ISO 8601'),
    body('reason').optional().trim(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const { id: doctorId } = req.params;
    const { leaveDate: leaveDateStr, reason } = req.body;

    try {
      // Doctors may only mark their own leave
      if (req.user.role === 'doctor') {
        const doctor = await prisma.doctor.findUnique({ where: { id: doctorId } });
        if (!doctor || doctor.userId !== req.user.userId) {
          return res.status(403).json({ error: 'Forbidden', message: 'You can only manage your own leave' });
        }
      }

      const leaveDate = new Date(leaveDateStr);
      leaveDate.setUTCHours(0, 0, 0, 0);
      const leaveDateEnd = new Date(leaveDateStr);
      leaveDateEnd.setUTCHours(23, 59, 59, 999);

      const leave = await prisma.doctorLeave.upsert({
        where: { doctorId_leaveDate: { doctorId, leaveDate } },
        update: { reason },
        create: { doctorId, leaveDate, reason },
      });

      // Cancel all confirmed appointments on that day
      const affected = await prisma.appointment.findMany({
        where: { doctorId, slotStartTime: { gte: leaveDate, lte: leaveDateEnd }, status: 'confirmed' },
        include: {
          patient: { select: { id: true, name: true, email: true } },
          doctor: { select: { id: true, name: true } },
        },
      });

      if (affected.length > 0) {
        await prisma.appointment.updateMany({
          where: { id: { in: affected.map((a) => a.id) } },
          data: { status: 'cancelled_by_leave' },
        });
        // Enqueue cancellation emails — lazy import so Phase 3 works before Phase 5
        try {
          const { enqueueCancellationEmail } = require('../services/emailService');
          const rebookingLink = `${process.env.APP_BASE_URL || 'http://localhost:3001'}/patient/doctors`;
          for (const appt of affected) {
            await enqueueCancellationEmail(
              appt.patient,
              { name: appt.doctor.name },
              appt,
              reason || 'Doctor on leave',
              rebookingLink
            );
          }
        } catch (e) {
          console.warn('Email service not available yet:', e.message);
        }
      }

      return res.status(201).json({
        leave,
        cancelledAppointments: affected.length,
        message: `Leave recorded. ${affected.length} appointment(s) cancelled.`,
      });
    } catch (err) {
      if (err.code === 'P2002') {
        return res.status(409).json({ error: 'Conflict', message: 'Leave already marked for this date' });
      }
      console.error('Mark leave error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// GET /api/doctors/my — get the authenticated doctor's own profile
router.get('/my', authenticateToken, requireRole('doctor'), async (req, res) => {
  try {
    const doctor = await prisma.doctor.findFirst({ where: { userId: req.user.userId } });
    if (!doctor) return res.status(404).json({ error: 'Doctor profile not found' });
    return res.json(doctor);
  } catch (err) {
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
