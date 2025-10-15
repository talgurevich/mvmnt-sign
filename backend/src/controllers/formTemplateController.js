// Form Template Controller
// Handles CRUD operations for form templates

const { supabaseAdmin } = require('../config/supabase')
const documentService = require('../services/documentService')
const { catchAsync, AppError } = require('../middleware/errorHandler')

// Get all form templates (with pagination and search)
exports.getFormTemplates = catchAsync(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    search = '',
    is_active = null
  } = req.query

  const offset = (page - 1) * limit

  // Build query
  let query = supabaseAdmin
    .from('form_templates')
    .select('*', { count: 'exact' })
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  // Apply filters
  if (search) {
    query = query.ilike('template_name', `%${search}%`)
  }

  if (is_active !== null) {
    query = query.eq('is_active', is_active)
  }

  // Apply pagination
  query = query.range(offset, offset + limit - 1)

  const { data, error, count } = await query

  if (error) {
    console.error('Error fetching form templates:', error)
    throw new AppError('שגיאה בטעינת תבניות', 500)
  }

  res.json({
    data,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: count,
      totalPages: Math.ceil(count / limit)
    }
  })
})

// Get single form template
exports.getFormTemplateById = catchAsync(async (req, res) => {
  const { id } = req.params

  const { data, error } = await supabaseAdmin
    .from('form_templates')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (error || !data) {
    throw new AppError('תבנית לא נמצאה', 404)
  }

  res.json(data)
})

// Upload and create form template
exports.createFormTemplate = catchAsync(async (req, res) => {
  if (!req.file) {
    throw new AppError('לא הועלה קובץ', 400)
  }

  const { template_name, description } = req.body

  if (!template_name) {
    throw new AppError('שם תבנית הוא שדה חובה', 400)
  }

  // Process document (upload and convert if needed)
  const processedDoc = await documentService.processDocument(req.file)

  // Create form template record
  const { data, error } = await supabaseAdmin
    .from('form_templates')
    .insert({
      template_name,
      description: description || null,
      file_path: processedDoc.pdfPath,
      file_url: processedDoc.pdfUrl,
      original_filename: processedDoc.originalName,
      page_count: processedDoc.pageCount,
      file_size: processedDoc.fileSize,
      signature_positions: [], // Empty array, will be configured later
      is_active: true
    })
    .select()
    .single()

  if (error) {
    // If DB insert fails, delete uploaded file
    await documentService.deleteFromStorage(processedDoc.pdfPath).catch(() => {})
    console.error('Error creating form template:', error)
    throw new AppError('שגיאה ביצירת תבנית', 500)
  }

  // Log audit
  await supabaseAdmin.from('audit_log').insert({
    user_id: req.userId,
    action: 'form_template_created',
    entity_type: 'form_template',
    entity_id: data.id,
    details: {
      template_name: data.template_name,
      page_count: data.page_count
    }
  })

  res.status(201).json({
    message: 'תבנית נוצרה בהצלחה',
    data
  })
})

// Update form template (mainly for signature positions)
exports.updateFormTemplate = catchAsync(async (req, res) => {
  const { id } = req.params
  const {
    template_name,
    description,
    signature_positions,
    is_active
  } = req.body

  // Check if template exists
  const { data: existing, error: checkError } = await supabaseAdmin
    .from('form_templates')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (checkError || !existing) {
    throw new AppError('תבנית לא נמצאה', 404)
  }

  // Build update object
  const updates = {
    updated_at: new Date().toISOString()
  }

  if (template_name !== undefined) updates.template_name = template_name
  if (description !== undefined) updates.description = description
  if (signature_positions !== undefined) {
    // Validate signature positions format
    if (!Array.isArray(signature_positions)) {
      throw new AppError('signature_positions חייב להיות מערך', 400)
    }
    updates.signature_positions = signature_positions
  }
  if (is_active !== undefined) updates.is_active = is_active

  // Update in database
  const { data, error } = await supabaseAdmin
    .from('form_templates')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Error updating form template:', error)
    throw new AppError('שגיאה בעדכון תבנית', 500)
  }

  // Log audit
  await supabaseAdmin.from('audit_log').insert({
    user_id: req.userId,
    action: 'form_template_updated',
    entity_type: 'form_template',
    entity_id: data.id,
    details: {
      updates: Object.keys(updates)
    }
  })

  res.json({
    message: 'תבנית עודכנה בהצלחה',
    data
  })
})

// Delete form template (soft delete)
exports.deleteFormTemplate = catchAsync(async (req, res) => {
  const { id } = req.params

  // Check if template exists
  const { data: existing, error: checkError } = await supabaseAdmin
    .from('form_templates')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (checkError || !existing) {
    throw new AppError('תבנית לא נמצאה', 404)
  }

  // Check if template is in use
  const { data: inUse, error: useError } = await supabaseAdmin
    .from('form_requests')
    .select('id')
    .eq('form_template_id', id)
    .limit(1)

  if (!useError && inUse && inUse.length > 0) {
    throw new AppError('לא ניתן למחוק תבנית שכבר נשלחה ללקוחות', 400)
  }

  // Soft delete
  const { error } = await supabaseAdmin
    .from('form_templates')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)

  if (error) {
    console.error('Error deleting form template:', error)
    throw new AppError('שגיאה במחיקת תבנית', 500)
  }

  // Log audit
  await supabaseAdmin.from('audit_log').insert({
    user_id: req.userId,
    action: 'form_template_deleted',
    entity_type: 'form_template',
    entity_id: id,
    details: {
      template_name: existing.template_name
    }
  })

  res.json({
    message: 'תבנית נמחקה בהצלחה'
  })
})

// Get form template statistics
exports.getFormTemplateStats = catchAsync(async (req, res) => {
  const { id } = req.params

  // Get template
  const { data: template, error: templateError } = await supabaseAdmin
    .from('form_templates')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single()

  if (templateError || !template) {
    throw new AppError('תבנית לא נמצאה', 404)
  }

  // Get usage stats
  const { data: requests, error: requestsError } = await supabaseAdmin
    .from('form_requests')
    .select('status')
    .eq('form_template_id', id)

  const stats = {
    template,
    usage: {
      total_sent: requests?.length || 0,
      pending: requests?.filter(r => r.status === 'pending').length || 0,
      signed: requests?.filter(r => r.status === 'signed').length || 0,
      viewed: requests?.filter(r => r.status === 'viewed').length || 0,
      expired: requests?.filter(r => r.status === 'expired').length || 0
    }
  }

  res.json(stats)
})

module.exports = exports
