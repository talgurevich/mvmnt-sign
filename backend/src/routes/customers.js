// Customer Routes
// All customer management endpoints

const express = require('express');
const router = express.Router();
const customerController = require('../controllers/customerController');
const { requireAuth } = require('../middleware/auth');

// All customer routes require authentication
router.use(requireAuth);

// Arbox sync (must be before /:id routes to avoid conflict)
router.post('/sync-from-arbox', customerController.syncFromArbox);

// Customer CRUD
router.get('/', customerController.getCustomers);
router.get('/:id', customerController.getCustomerById);
router.post('/', customerController.createCustomer);
router.put('/:id', customerController.updateCustomer);
router.delete('/:id', customerController.deleteCustomer);

// Document status and activity
router.get('/:id/document-status', customerController.getDocumentStatus);
router.get('/:id/activity', customerController.getCustomerActivity);
router.get('/:id/signed-documents', customerController.getSignedDocuments);
router.get('/:customerId/signed-documents/:documentId/download', customerController.downloadSignedDocument);

module.exports = router;
