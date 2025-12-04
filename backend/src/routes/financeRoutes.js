/**
 * Finance Routes
 * Bank transaction upload and analytics endpoints
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const { requireAuth } = require('../middleware/auth');
const financeController = require('../controllers/financeController');

// Configure multer for file upload (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept Excel files only
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
      'application/vnd.ms-excel' // .xls
    ];

    if (allowedTypes.includes(file.mimetype) ||
        file.originalname.endsWith('.xlsx') ||
        file.originalname.endsWith('.xls')) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files (.xlsx, .xls) are allowed'), false);
    }
  }
});

// All finance routes require authentication
router.use(requireAuth);

// POST /api/finance/upload - Upload and parse Excel file
router.post('/upload', upload.single('file'), financeController.uploadTransactions);

// GET /api/finance/transactions - Get all transactions with filters
router.get('/transactions', financeController.getTransactions);

// GET /api/finance/summary - Get summary statistics
router.get('/summary', financeController.getSummary);

// GET /api/finance/monthly - Get monthly aggregations
router.get('/monthly', financeController.getMonthlyData);

// GET /api/finance/categories - Get category breakdown
router.get('/categories', financeController.getCategoryBreakdown);

// GET /api/finance/recipients - Get transfer recipients breakdown
router.get('/recipients', financeController.getRecipients);

// GET /api/finance/imports - Get list of imports
router.get('/imports', financeController.getImports);

// DELETE /api/finance/imports/:id - Delete an import and its transactions
router.delete('/imports/:id', financeController.deleteImport);

module.exports = router;
