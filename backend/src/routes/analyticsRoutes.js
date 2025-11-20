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

// GET /api/analytics/members-over-time - Get historical member counts
router.get('/members-over-time', analyticsController.getMembersOverTime);

// GET /api/analytics/churn-over-time - Get member churn data
router.get('/churn-over-time', analyticsController.getChurnOverTime);

// GET /api/analytics/leads-over-time - Get new leads data
router.get('/leads-over-time', analyticsController.getLeadsOverTime);

module.exports = router;
