const express = require('express');
const router = express.Router();
const { requireAuth } = require('../middleware/auth');
const analyticsController = require('../controllers/analyticsController');

// All analytics routes require authentication
router.use(requireAuth);

// GET /api/analytics/overview - Get membership analytics overview
router.get('/overview', analyticsController.getAnalyticsOverview);

// GET /api/analytics/membership-breakdown - Get detailed membership breakdown
router.get('/membership-breakdown', analyticsController.getMembershipBreakdown);

module.exports = router;
