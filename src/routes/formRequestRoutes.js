// Form Request Routes
// API routes for sending and managing form requests

const express = require('express')
const router = express.Router()
const { requireAuth } = require('../middleware/auth')
const formRequestController = require('../controllers/formRequestController')

// All routes require authentication
router.use(requireAuth)

// GET /api/form-requests - Get all form requests (with pagination)
router.get('/', formRequestController.getFormRequests)

// GET /api/form-requests/:id - Get single form request
router.get('/:id', formRequestController.getFormRequestById)

// POST /api/form-requests - Create and send form request
router.post('/', formRequestController.createFormRequest)

// POST /api/form-requests/:id/resend - Resend form request
router.post('/:id/resend', formRequestController.resendFormRequest)

// PUT /api/form-requests/:id/cancel - Cancel form request
router.put('/:id/cancel', formRequestController.cancelFormRequest)

module.exports = router
