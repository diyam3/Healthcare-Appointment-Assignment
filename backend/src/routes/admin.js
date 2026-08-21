'use strict';
const express = require('express');
const bcrypt = require('bcrypt');
const { body, validationResult } = require('express-validator');
const { PrismaClient } = require('@prisma/client');
const { authenticateToken } = require('../middleware/auth');
const { requireRole } = require('../middleware/rbac');

const router = express.Router();
const prisma = new PrismaClient();

// All admin routes require auth + admin role
router.use(authenticateToken, requireRole('admin'));

// GET /api/admin/doctors
router.get('/doctors', async (req, res) => {
  try {
    const doctors = await prisma.doctor.findMany({
      include: { user: { select: { id: true, name: true, email: true, role: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return res.json(doctors);
  } catch (err) {
    console.error('List doctors error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/admin/doctors
router.post(
  '/doctors',
  [
    body('name').trim().notEmpty().withMessage('Name is required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
    body('specialization').trim().notEmpty().withMessage('Specialization is required'),
    body('slotDurationMin').isInt({ min: 5, max: 120 }).withMessage('Slot duration must be 5-120 minutes'),
    body('workingHours').isObject().withMessage('Working hours must be an object'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const { name, email, password, specialization, slotDurationMin, workingHours } = req.body;
    try {
      const existing = await prisma.user.findUnique({ where: { email } });
      if (existing) return res.status(409).json({ error: 'Conflict', message: 'Email already registered' });

      const passwordHash = await bcrypt.hash(password, 12);
      const result = await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({ data: { name, email, passwordHash, role: 'doctor' } });
        const doctor = await tx.doctor.create({
          data: { userId: user.id, name, specialization, slotDurationMin: Number(slotDurationMin), workingHours },
        });
        return { user, doctor };
      });

      return res.status(201).json({
        doctor: result.doctor,
        user: { id: result.user.id, name: result.user.name, email: result.user.email, role: result.user.role },
      });
    } catch (err) {
      console.error('Create doctor error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// PUT /api/admin/doctors/:id
router.put(
  '/doctors/:id',
  [
    body('name').optional().trim().notEmpty(),
    body('specialization').optional().trim().notEmpty(),
    body('slotDurationMin').optional().isInt({ min: 5, max: 120 }),
    body('workingHours').optional().isObject(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const { id } = req.params;
    const { name, specialization, slotDurationMin, workingHours } = req.body;
    try {
      const doctor = await prisma.doctor.findUnique({ where: { id } });
      if (!doctor) return res.status(404).json({ error: 'Not Found', message: 'Doctor not found' });

      const updates = {};
      if (name !== undefined) updates.name = name;
      if (specialization !== undefined) updates.specialization = specialization;
      if (slotDurationMin !== undefined) updates.slotDurationMin = Number(slotDurationMin);
      if (workingHours !== undefined) updates.workingHours = workingHours;

      const updated = await prisma.doctor.update({ where: { id }, data: updates });
      return res.json(updated);
    } catch (err) {
      console.error('Update doctor error:', err);
      return res.status(500).json({ error: 'Internal server error' });
    }
  }
);

// DELETE /api/admin/doctors/:id — soft delete
router.delete('/doctors/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const doctor = await prisma.doctor.findUnique({ where: { id } });
    if (!doctor) return res.status(404).json({ error: 'Not Found', message: 'Doctor not found' });
    await prisma.doctor.update({ where: { id }, data: { isActive: false } });
    return res.json({ message: 'Doctor deactivated successfully' });
  } catch (err) {
    console.error('Delete doctor error:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
});

module.exports = router;
