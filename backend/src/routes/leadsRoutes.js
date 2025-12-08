/**
 * Leads Routes
 * Arbox leads management endpoints
 */

const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const leadsController = require('../controllers/leadsController');

// All leads routes require authentication
router.use(requireAuth);

// GET /api/leads - Get all leads with optional filters
router.get('/', leadsController.getAllLeads);

// GET /api/leads/stats - Get leads statistics
router.get('/stats', leadsController.getLeadsStats);

// GET /api/leads/new - Get new/uncontacted leads
router.get('/new', leadsController.getNewLeads);

// GET /api/leads/converted - Get converted leads
router.get('/converted', leadsController.getConvertedLeads);

// GET /api/leads/lost - Get lost leads
router.get('/lost', leadsController.getLostLeads);

module.exports = router;
