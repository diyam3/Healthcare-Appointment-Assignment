'use strict';
const express = require('express');
const jwt = require('jsonwebtoken');
const { getAuthUrl, handleOAuthCallback } = require('../services/calendarService');

const router = express.Router();

/**
 * Validate JWT from either Authorization header OR ?token= query param.
 * Used only for the OAuth initiation route where browser navigation
 * can't carry custom headers.
 */
function authenticateTokenFlexible(req, res, next) {
  const headerToken = req.headers['authorization']?.startsWith('Bearer ')
    ? req.headers['authorization'].slice(7)
    : null;
  const token = headerToken || req.query.token;

  if (!token) {
    return res.status(401).json({ error: 'Unauthorized', message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { userId: decoded.userId, role: decoded.role };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized', message: 'Invalid or expired token' });
  }
}

// GET /api/oauth/google?token=<jwt>
// Accepts JWT as query param so it works as a direct browser URL.
// Embeds userId in the OAuth state param — no JWT needed on the callback.
router.get('/google', authenticateTokenFlexible, (req, res) => {
  const state = Buffer.from(JSON.stringify({ userId: req.user.userId })).toString('base64');
  const url = getAuthUrl(state);
  res.redirect(url);
});

// GET /api/oauth/google/callback
// Google redirects here after consent. No JWT needed — userId comes from state.
router.get('/google/callback', async (req, res) => {
  const { code, state, error } = req.query;

  if (error) {
    return res.send(`<p>Google OAuth denied: ${error}. <a href="http://localhost:5173">Back to app</a></p>`);
  }
  if (!code) {
    return res.status(400).send('<p>Missing authorization code.</p>');
  }

  let userId;
  try {
    const parsed = JSON.parse(Buffer.from(state, 'base64').toString('utf8'));
    userId = parsed.userId;
  } catch {
    return res.status(400).send('<p>Invalid state parameter.</p>');
  }

  try {
    await handleOAuthCallback(code, userId);
    res.send(`
      <html><body style="font-family:sans-serif;padding:40px;max-width:500px;margin:auto">
        <h2>&#x2705; Google Calendar connected!</h2>
        <p>Your Google Calendar is now linked. Future appointments will automatically appear in your calendar.</p>
        <p><a href="http://localhost:5173/patient/appointments">Back to My Appointments</a></p>
      </body></html>
    `);
  } catch (err) {
    console.error('OAuth callback error:', err);
    res.status(500).send(`<p>Failed to connect Google Calendar: ${err.message}</p>`);
  }
});

module.exports = router;
