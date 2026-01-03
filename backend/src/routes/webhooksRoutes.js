/**
 * Webhooks Routes
 * Public endpoints for receiving webhooks from external services (Twilio, etc.)
 * No authentication required - these are called by external services
 */

const express = require('express');
const router = express.Router();
const webhooksController = require('../controllers/webhooksController');

// Twilio WhatsApp incoming message webhook
// Configure this URL in Twilio: https://mvmnt-sign-api-8a9b0db245c2.herokuapp.com/webhooks/whatsapp
router.post('/whatsapp', webhooksController.handleWhatsAppIncoming);

// Twilio WhatsApp status callback
// Configure this URL in Twilio for delivery status updates
router.post('/whatsapp/status', webhooksController.handleWhatsAppStatus);

module.exports = router;
