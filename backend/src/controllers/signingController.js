// Signing Controller
// Public endpoints for customers to sign documents

const { supabaseAdmin } = require('../config/supabase')
const documentService = require('../services/documentService')
const { catchAsync, AppError } = require('../middleware/errorHandler')
const { sendDocumentSignedNotification } = require('../services/notifications')

// Get form request details by token (public)
exports.getFormRequestByToken = catchAsync(async (req, res) => {
  const { token } = req.params

  // Get form request with related data
  const { data: formRequest, error } = await supabaseAdmin
    .from('form_requests')
    .select(`
      *,
      customer:customers(id, first_name, last_name, phone_number, email),
      template:form_templates(id, template_name, description, page_count, file_url, text_content)
    `)
    .eq('signing_token', token)
    .single()

  if (error || !formRequest) {
    throw new AppError('קישור לא תקף או פג תוקף', 404)
  }

  // Check if expired
  const now = new Date()
  const expiresAt = new Date(formRequest.token_expires_at)

  if (now > expiresAt) {
    throw new AppError('הקישור פג תוקף', 410)
  }

  // Check if already signed
  if (formRequest.status === 'signed') {
    throw new AppError('המסמך כבר נחתם', 400)
  }

  // Update status to 'opened' if it's still 'created' or 'sent'
  if (formRequest.status === 'created' || formRequest.status === 'sent') {
    await supabaseAdmin
      .from('form_requests')
      .update({
        status: 'opened',
        opened_at: new Date().toISOString()
      })
      .eq('id', formRequest.id)
  }

  // Add sender information (business name from env)
  const response = {
    ...formRequest,
    sender_name: process.env.COMPANY_NAME || 'העסק'
  }

  res.json(response)
})

// Submit signature (public)
exports.submitSignature = catchAsync(async (req, res) => {
  const { token } = req.params
  const { signer_name, signature_data } = req.body

  if (!signer_name) {
    throw new AppError('שם החותם הוא שדה חובה', 400)
  }

  if (!signature_data) {
    throw new AppError('חתימה היא שדה חובה', 400)
  }

  // Get form request with template and customer info
  const { data: formRequest, error: fetchError } = await supabaseAdmin
    .from('form_requests')
    .select(`
      *,
      template:form_templates(id, template_name, file_url, original_filename),
      customer:customers(id, first_name, last_name, email, phone_number)
    `)
    .eq('signing_token', token)
    .single()

  if (fetchError || !formRequest) {
    throw new AppError('קישור לא תקף', 404)
  }

  // Check if expired
  const now = new Date()
  const expiresAt = new Date(formRequest.token_expires_at)

  if (now > expiresAt) {
    throw new AppError('הקישור פג תוקף', 410)
  }

  // Check if already signed
  if (formRequest.status === 'signed') {
    throw new AppError('המסמך כבר נחתם', 400)
  }

  let signedDocument = null
  let signedDocUrl = null

  // Only generate PDF for file-based templates
  if (formRequest.template.file_url) {
    // Generate signed PDF
    const signedPdfBuffer = await documentService.addSignatureToPDF(
      formRequest.template.file_url,
      signature_data,
      signer_name
    )

    // Upload signed PDF to storage
    const uploadedDoc = await documentService.uploadSignedDocument(
      signedPdfBuffer,
      formRequest.template.original_filename
    )

    // Create signed document record
    const { data: signedDoc, error: docError } = await supabaseAdmin
      .from('signed_documents')
      .insert({
        form_request_id: formRequest.id,
        file_path: uploadedDoc.path,
        file_url: uploadedDoc.url,
        file_size: signedPdfBuffer.length
      })
      .select()
      .single()

    if (docError) {
      console.error('Error creating signed document:', docError)
      throw new AppError('שגיאה בשמירת מסמך חתום', 500)
    }

    signedDocument = signedDoc
    signedDocUrl = uploadedDoc.url
  }

  // Create signature record
  const signatureRecord = {
    form_request_id: formRequest.id,
    signer_name,
    signature_type: 'drawn',
    signature_data: signature_data,
    signed_at: new Date().toISOString()
  }

  // Only add signed_document_id if we created a signed document
  if (signedDocument) {
    signatureRecord.signed_document_id = signedDocument.id
  }

  const { data: signature, error: sigError } = await supabaseAdmin
    .from('signatures')
    .insert(signatureRecord)
    .select()
    .single()

  if (sigError) {
    console.error('Error creating signature:', sigError)
    throw new AppError('שגיאה בשמירת החתימה', 500)
  }

  // Update form request status
  const { error: updateError } = await supabaseAdmin
    .from('form_requests')
    .update({
      status: 'signed',
      signed_at: new Date().toISOString()
    })
    .eq('id', formRequest.id)

  if (updateError) {
    console.error('Error updating form request:', updateError)
  }

  // Log audit
  await supabaseAdmin.from('audit_log').insert({
    form_request_id: formRequest.id,
    customer_id: formRequest.customer_id,
    event_type: 'document_signed',
    event_data: {
      signer_name,
      signature_id: signature.id,
      signed_document_id: signedDocument?.id || null
    }
  })

  // Send notification to admin about the signed document
  const customerName = formRequest.customer
    ? `${formRequest.customer.first_name || ''} ${formRequest.customer.last_name || ''}`.trim()
    : 'לקוח לא ידוע';
  const templateName = formRequest.template?.template_name || 'מסמך';
  const signedAt = new Date().toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' });

  // Fire and forget - don't block response for notification
  sendDocumentSignedNotification({
    customerName,
    templateName,
    signerName: signer_name,
    signedAt,
    signedDocumentUrl: signedDocUrl,
    formRequestId: formRequest.id
  }).catch(err => console.error('[SigningController] Notification error:', err));

  res.json({
    message: 'המסמך נחתם בהצלחה',
    data: {
      signature_id: signature.id,
      signed_at: signature.signed_at,
      signed_document_url: signedDocUrl
    }
  })
})

module.exports = exports
