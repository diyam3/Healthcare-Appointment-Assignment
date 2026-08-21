'use strict';
const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { getAuthUrl, handleOAuthCallback } = require('../services/calendarService');

const router = express.Router();

// GET /api/oauth/google — redirect user to Google's OAuth consent screen
router.get('/google', authenticateToken, (req, res) => {
  const url = getAuthUrl();
  res.json({ authUrl: url });
});

// GET /api/oauth/google/callback — handle OAuth code exchange
router.get('/google/callback', authenticateToken, async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).json({ error: 'Missing authorization code' });

  try {
    await handleOAuthCallback(code, req.user.userId);
    res.json({ message: 'Google Calendar connected successfully' });
  } catch (err) {
    console.error('OAuth callback error:', err);
    res.status(500).json({ error: 'Failed to connect Google Calendar', details: err.message });
  }
});

module.exports = router;
