/**
 * Waitlist Routes
 * Arbox waiting list management endpoints
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const waitlistController = require('../controllers/waitlistController');

// All waitlist routes require authentication
router.use(requireAuth);

// GET /api/waitlist - Get waiting list for next 3 days (default)
router.get('/', waitlistController.getWaitlist);

// GET /api/waitlist/stats - Get waiting list statistics
router.get('/stats', waitlistController.getWaitlistStats);

module.exports = router;
