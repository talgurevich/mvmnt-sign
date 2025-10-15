// Form Request Controller
// Handles sending forms to customers and tracking their status

const { supabaseAdmin } = require('../config/supabase')
const jwt = require('jsonwebtoken')
const { catchAsync, AppError } = require('../middleware/errorHandler')

// Generate signing token (valid for 30 days)
const generateSigningToken = (formRequestId, customerId) => {
  return jwt.sign(
    { formRequestId, customerId },
    process.env.SIGNING_TOKEN_SECRET,
    { expiresIn: '30d' }
  )
}

// Generate WhatsApp link with pre-filled message
const generateWhatsAppLink = (phoneNumber, message) => {
  // Remove leading zeros, spaces, and dashes
  const cleanNumber = phoneNumber.replace(/^0+|[\s-]/g, '')

  // Add Israel country code if not present
  const fullNumber = cleanNumber.startsWith('972') ? cleanNumber : `972${cleanNumber}`

  // URL encode the message
  const encodedMessage = encodeURIComponent(message)

  return `https://wa.me/${fullNumber}?text=${encodedMessage}`
}

// Get all form requests (with pagination)
exports.getFormRequests = catchAsync(async (req, res) => {
  const {
    page = 1,
    limit = 10,
    status = null,
    customer_id = null,
    template_id = null
  } = req.query

  const offset = (page - 1) * limit

  let query = supabaseAdmin
    .from('form_requests')
    .select(`
      *,
      customer:customers(id, first_name, last_name, phone_number, email),
      template:form_templates(id, template_name, page_count)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })

  // Apply filters
  if (status) query = query.eq('status', status)
  if (customer_id) query = query.eq('customer_id', customer_id)
  if (template_id) query = query.eq('form_template_id', template_id)

  // Apply pagination
  query = query.range(offset, offset + limit - 1)

  const { data, error, count } = await query

  if (error) {
    console.error('Error fetching form requests:', error)
    throw new AppError('שגיאה בטעינת בקשות', 500)
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

// Get single form request
exports.getFormRequestById = catchAsync(async (req, res) => {
  const { id } = req.params

  const { data, error } = await supabaseAdmin
    .from('form_requests')
    .select(`
      *,
      customer:customers(*),
      template:form_templates(*),
      signature:signatures(*)
    `)
    .eq('id', id)
    .single()

  if (error || !data) {
    throw new AppError('בקשה לא נמצאה', 404)
  }

  res.json(data)
})

// Create and send form request
exports.createFormRequest = catchAsync(async (req, res) => {
  const { customer_id, form_template_id, expiry_days = 30, custom_message } = req.body

  if (!customer_id || !form_template_id) {
    throw new AppError('מזהה לקוח ותבנית הם שדות חובה', 400)
  }

  // Verify customer exists
  const { data: customer, error: customerError } = await supabaseAdmin
    .from('customers')
    .select('*')
    .eq('id', customer_id)
    .is('deleted_at', null)
    .single()

  if (customerError || !customer) {
    throw new AppError('לקוח לא נמצא', 404)
  }

  // Verify template exists
  const { data: template, error: templateError } = await supabaseAdmin
    .from('form_templates')
    .select('*')
    .eq('id', form_template_id)
    .is('deleted_at', null)
    .single()

  if (templateError || !template) {
    throw new AppError('תבנית לא נמצאה', 404)
  }

  // Calculate expiry date
  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + parseInt(expiry_days))

  // Create form request
  const { data: formRequest, error: createError } = await supabaseAdmin
    .from('form_requests')
    .insert({
      customer_id,
      form_template_id,
      status: 'pending',
      expires_at: expiresAt.toISOString()
    })
    .select()
    .single()

  if (createError) {
    console.error('Error creating form request:', error)
    throw new AppError('שגיאה ביצירת בקשה', 500)
  }

  // Generate signing token
  const signingToken = generateSigningToken(formRequest.id, customer_id)

  // Update form request with token
  const { error: updateError } = await supabaseAdmin
    .from('form_requests')
    .update({ signing_token: signingToken })
    .eq('id', formRequest.id)

  if (updateError) {
    console.error('Error updating form request with token:', updateError)
  }

  // Generate signing URL
  const signingUrl = `${process.env.FRONTEND_URL}/sign/${signingToken}`

  // Generate WhatsApp message
  const defaultMessage = custom_message ||
    `שלום ${customer.first_name},\n\n` +
    `נשלח אליך מסמך לחתימה: ${template.template_name}\n\n` +
    `לחץ על הקישור למעבר לחתימה:\n${signingUrl}\n\n` +
    `הקישור תקף ל-${expiry_days} ימים.\n\n` +
    `תודה!`

  const whatsappLink = generateWhatsAppLink(customer.phone_number, defaultMessage)

  // Update customer document counts
  await supabaseAdmin.rpc('increment_customer_documents', {
    customer_uuid: customer_id,
    sent_count: 1
  }).catch(() => {
    // Fallback: manual update
    supabaseAdmin
      .from('customers')
      .update({
        total_documents_sent: (customer.total_documents_sent || 0) + 1
      })
      .eq('id', customer_id)
  })

  // Log audit
  await supabaseAdmin.from('audit_log').insert({
    user_id: req.userId,
    action: 'form_request_created',
    entity_type: 'form_request',
    entity_id: formRequest.id,
    details: {
      customer_id,
      template_id: form_template_id,
      customer_name: `${customer.first_name} ${customer.last_name}`,
      template_name: template.template_name
    }
  })

  res.status(201).json({
    message: 'בקשה נוצרה בהצלחה',
    data: {
      ...formRequest,
      signing_token: signingToken,
      signing_url: signingUrl,
      whatsapp_link: whatsappLink,
      customer,
      template
    }
  })
})

// Resend form request
exports.resendFormRequest = catchAsync(async (req, res) => {
  const { id } = req.params

  // Get form request with customer and template
  const { data: formRequest, error } = await supabaseAdmin
    .from('form_requests')
    .select(`
      *,
      customer:customers(*),
      template:form_templates(*)
    `)
    .eq('id', id)
    .single()

  if (error || !formRequest) {
    throw new AppError('בקשה לא נמצאה', 404)
  }

  // Check if already signed
  if (formRequest.status === 'signed') {
    throw new AppError('מסמך זה כבר נחתם', 400)
  }

  // Check if expired - extend expiry by 30 days
  const newExpiryDate = new Date()
  newExpiryDate.setDate(newExpiryDate.getDate() + 30)

  // Update form request
  await supabaseAdmin
    .from('form_requests')
    .update({
      status: 'pending',
      expires_at: newExpiryDate.toISOString(),
      resent_at: new Date().toISOString()
    })
    .eq('id', id)

  // Generate signing URL
  const signingUrl = `${process.env.FRONTEND_URL}/sign/${formRequest.signing_token}`

  // Generate WhatsApp message
  const message =
    `שלום ${formRequest.customer.first_name},\n\n` +
    `תזכורת - נשלח אליך מסמך לחתימה: ${formRequest.template.template_name}\n\n` +
    `לחץ על הקישור למעבר לחתימה:\n${signingUrl}\n\n` +
    `הקישור תקף ל-30 ימים נוספים.\n\n` +
    `תודה!`

  const whatsappLink = generateWhatsAppLink(formRequest.customer.phone_number, message)

  // Log audit
  await supabaseAdmin.from('audit_log').insert({
    user_id: req.userId,
    action: 'form_request_resent',
    entity_type: 'form_request',
    entity_id: id
  })

  res.json({
    message: 'בקשה נשלחה מחדש בהצלחה',
    data: {
      whatsapp_link: whatsappLink,
      signing_url: signingUrl,
      expires_at: newExpiryDate.toISOString()
    }
  })
})

// Cancel form request
exports.cancelFormRequest = catchAsync(async (req, res) => {
  const { id } = req.params

  const { data, error } = await supabaseAdmin
    .from('form_requests')
    .update({ status: 'expired' })
    .eq('id', id)
    .select()
    .single()

  if (error || !data) {
    throw new AppError('בקשה לא נמצאה', 404)
  }

  // Log audit
  await supabaseAdmin.from('audit_log').insert({
    user_id: req.userId,
    action: 'form_request_cancelled',
    entity_type: 'form_request',
    entity_id: id
  })

  res.json({
    message: 'בקשה בוטלה בהצלחה',
    data
  })
})

module.exports = exports
