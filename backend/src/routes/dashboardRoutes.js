// Dashboard Routes
// API routes for dashboard statistics and activity

const express = require('express')
const router = express.Router()
const { requireAuth } = require('../middleware/auth')
const dashboardController = require('../controllers/dashboardController')

// All routes require authentication
router.use(requireAuth)

// GET /api/dashboard/stats - Get dashboard statistics
router.get('/stats', dashboardController.getDashboardStats)

// GET /api/dashboard/activity - Get recent activity
router.get('/activity', dashboardController.getRecentActivity)

// GET /api/dashboard/recent-requests - Get recent form requests
router.get('/recent-requests', dashboardController.getRecentFormRequests)

// GET /api/dashboard/stats-by-date - Get statistics by date range
router.get('/stats-by-date', dashboardController.getStatsByDateRange)

// GET /api/dashboard/top-templates - Get top performing templates
router.get('/top-templates', dashboardController.getTopTemplates)

module.exports = router
