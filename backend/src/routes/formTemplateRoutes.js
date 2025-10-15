// Form Template Routes
// API routes for form template management

const express = require('express')
const multer = require('multer')
const router = express.Router()
const { requireAuth } = require('../middleware/auth')
const formTemplateController = require('../controllers/formTemplateController')

// Configure multer for file upload (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
    ]

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('סוג קובץ לא נתמך. אנא העלה PDF, DOC או DOCX'))
    }
  }
})

// All routes require authentication
router.use(requireAuth)

// GET /api/form-templates - Get all form templates (with pagination)
router.get('/', formTemplateController.getFormTemplates)

// GET /api/form-templates/:id - Get single form template
router.get('/:id', formTemplateController.getFormTemplateById)

// GET /api/form-templates/:id/stats - Get form template statistics
router.get('/:id/stats', formTemplateController.getFormTemplateStats)

// POST /api/form-templates - Create new form template (with file upload)
router.post('/', upload.single('file'), formTemplateController.createFormTemplate)

// PUT /api/form-templates/:id - Update form template
router.put('/:id', formTemplateController.updateFormTemplate)

// DELETE /api/form-templates/:id - Delete form template
router.delete('/:id', formTemplateController.deleteFormTemplate)

module.exports = router
