// Customer Routes
// All customer management endpoints

const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const { requireAuth } = require('../middleware/auth');

// All customer routes require authentication
router.use(requireAuth);

// Customer CRUD
router.get('/', customerController.getCustomers);
router.get('/:id', customerController.getCustomerById);
router.post('/', customerController.createCustomer);
router.put('/:id', customerController.updateCustomer);
router.delete('/:id', customerController.deleteCustomer);

// Arbox sync
router.post('/sync', customerController.syncFromArbox);

// Document status and activity
router.get('/:id/document-status', customerController.getDocumentStatus);
router.get('/:id/activity', customerController.getCustomerActivity);

module.exports = router;
