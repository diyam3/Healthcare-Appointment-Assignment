'use strict';
const express = require('express');
const { authenticateToken } = require('../middleware/auth');
const { getAuthUrl, handleOAuthCallback } = require('../services/calendarService');

const router = express.Router();

// GET /api/oauth/google
// Patient/doctor calls this while logged in. We embed userId in the OAuth
// state param so the callback can identify the user without a JWT.
router.get('/google', authenticateToken, (req, res) => {
  const state = Buffer.from(JSON.stringify({ userId: req.user.userId })).toString('base64');
  const url = getAuthUrl(state);
  // Redirect directly so the user doesn't have to copy-paste the URL
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
    // Redirect back to the app with a success message
    res.send(`
      <html><body style="font-family:sans-serif;padding:40px">
        <h2>✅ Google Calendar connected!</h2>
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
