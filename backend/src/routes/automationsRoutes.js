/**
 * Automations Routes
 * Manage automation settings
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const automationsController = require('../controllers/automationsController');

// All routes require authentication
router.use(requireAuth);

// Get all automations
router.get('/', automationsController.getAutomations);

// Get single automation
router.get('/:id', automationsController.getAutomation);

// Toggle automation on/off
router.patch('/:id/toggle', automationsController.toggleAutomation);

// Update automation settings
router.put('/:id', automationsController.updateAutomation);

module.exports = router;
