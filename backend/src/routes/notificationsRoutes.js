/**
 * Notifications Routes
 * Admin endpoints for notification management
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const notificationsController = require('../controllers/notificationsController');

// All routes require authentication
router.use(requireAuth);

// Notification history
router.get('/history', notificationsController.getHistory);

// Job runs
router.get('/jobs', notificationsController.getJobRuns);

// Trigger test run
router.post('/test', notificationsController.triggerTestRun);

// Admin recipients
router.get('/recipients', notificationsController.getRecipients);
router.post('/recipients', notificationsController.addRecipient);
router.put('/recipients/:id', notificationsController.updateRecipient);
router.delete('/recipients/:id', notificationsController.deleteRecipient);

// State management (for debugging)
router.get('/state', notificationsController.getState);
router.delete('/state', notificationsController.clearState);

module.exports = router;
