'use strict';
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const express = require('express');
const cors = require('cors');

const authRouter        = require('./routes/auth');
const adminRouter       = require('./routes/admin');
const doctorsRouter     = require('./routes/doctors');
const appointmentsRouter = require('./routes/appointments');
const oauthRouter       = require('./routes/oauth');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Routes
app.use('/api/auth',         authRouter);
app.use('/api/admin',        adminRouter);
app.use('/api/doctors',      doctorsRouter);
app.use('/api/appointments', appointmentsRouter);
app.use('/api/oauth',        oauthRouter);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Not Found', message: `Route ${req.method} ${req.path} not found` });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal Server Error', message: err.message || 'Something went wrong' });
});

module.exports = app;
