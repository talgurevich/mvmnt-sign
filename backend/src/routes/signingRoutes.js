// Signing Routes (Public)
// Routes for customers to view and sign documents

const express = require('express')
const router = express.Router()
const signingController = require('../controllers/signingController')

// Public routes - no authentication required
// GET /api/sign/:token - Get form request details
router.get('/:token', signingController.getFormRequestByToken)

// POST /api/sign/:token - Submit signature
router.post('/:token', signingController.submitSignature)

module.exports = router
