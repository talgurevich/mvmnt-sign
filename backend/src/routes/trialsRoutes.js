/**
 * Trials Routes
 * Endpoints for trial session management
 */

const express = require('express');
const router = express.Router();
const trialsController = require('../controllers/trialsController');
const { requireAuth } = require('../middleware/auth');

// All routes require authentication
router.use(requireAuth);

// GET /api/trials - Get upcoming trials
router.get('/', trialsController.getTrials);

// GET /api/trials/reminders - Get trials needing reminder
router.get('/reminders', trialsController.getTrialsNeedingReminder);

module.exports = router;
