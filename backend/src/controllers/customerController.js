// Customer Controller
// Full CRUD operations for customer management
// Hebrew-focused system for Israeli market

const { supabaseAdmin } = require('../config/supabase');
const { catchAsync, AppError } = require('../middleware/errorHandler');
const arboxService = require('../services/arboxService');

/**
 * Get all customers with filters, search, and pagination
 * GET /api/customers
 */
exports.getCustomers = catchAsync(async (req, res) => {
  const {
    page = 1,
    limit = 20,
    filter = 'all',
    sort = 'name_asc',
    search = ''
  } = req.query;

  const offset = (page - 1) * limit;

  // Build query
  let query = supabaseAdmin
    .from('customers')
    .select('*', { count: 'exact' })
    .is('deleted_at', null);

  // Apply search
  if (search) {
    query = query.or(`first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%,phone_number.ilike.%${search}%`);
  }

  // Apply filters
  switch (filter) {
    case 'active':
      query = query.gt('total_documents_signed', 0);
      break;
    case 'pending':
      query = query.gt('total_documents_sent', 'total_documents_signed');
      break;
    case 'never_sent':
      query = query.eq('total_documents_sent', 0);
      break;
  }

  // Apply sorting
  switch (sort) {
    case 'name_asc':
      query = query.order('first_name', { ascending: true });
      break;
    case 'name_desc':
      query = query.order('first_name', { ascending: false });
      break;
    case 'activity_desc':
      query = query.order('last_document_sent_at', { ascending: false, nullsFirst: false });
      break;
    case 'documents_desc':
      query = query.order('total_documents_sent', { ascending: false });
      break;
  }

  // Apply pagination
  query = query.range(offset, offset + parseInt(limit) - 1);

  const { data: customers, error, count } = await query;

  if (error) {
    throw new AppError('Failed to fetch customers', 500);
  }

  res.json({
    success: true,
    data: customers,
    pagination: {
      page: parseInt(page),
      limit: parseInt(limit),
      total: count,
      total_pages: Math.ceil(count / limit)
    }
  });
});

/**
 * Get single customer by ID with related data
 * GET /api/customers/:id
 */
exports.getCustomerById = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { include } = req.query;

  // Get customer
  const { data: customer, error } = await supabaseAdmin
    .from('customers')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .single();

  if (error || !customer) {
    throw new AppError('לקוח לא נמצא', 404); // "Customer not found" in Hebrew
  }

  // Include related data if requested
  if (include) {
    const includes = include.split(',');

    if (includes.includes('settings')) {
      const { data: settings } = await supabaseAdmin
        .from('customer_settings')
        .select(`
          *,
          form_templates (
            id,
            name
          )
        `)
        .eq('customer_id', id)
        .single();

      customer.settings = settings || null;
    }

    if (includes.includes('documents')) {
      const { data: documents } = await supabaseAdmin
        .from('form_requests')
        .select(`
          *,
          form_templates (
            id,
            name
          )
        `)
        .eq('customer_id', id)
        .order('created_at', { ascending: false });

      customer.recent_documents = documents || [];
    }
  }

  res.json({
    success: true,
    data: customer
  });
});

/**
 * Create new customer
 * POST /api/customers
 */
exports.createCustomer = catchAsync(async (req, res) => {
  const {
    first_name,
    last_name,
    email,
    phone_number,
    date_of_birth,
    address,
    city,
    state,
    zip_code,
    arbox_customer_id
  } = req.body;

  // Validate required fields
  if (!first_name || !last_name || !phone_number) {
    throw new AppError('שם פרטי, שם משפחה ומספר טלפון הם שדות חובה', 400); // "First name, last name and phone number are required" in Hebrew
  }

  // Check if customer already exists
  if (arbox_customer_id) {
    const { data: existing } = await supabaseAdmin
      .from('customers')
      .select('id')
      .eq('arbox_customer_id', arbox_customer_id)
      .is('deleted_at', null)
      .single();

    if (existing) {
      throw new AppError('לקוח עם מזהה Arbox זה כבר קיים', 409); // "Customer with this Arbox ID already exists" in Hebrew
    }
  }

  // Create customer
  const { data: customer, error } = await supabaseAdmin
    .from('customers')
    .insert([{
      first_name,
      last_name,
      email,
      phone_number,
      date_of_birth,
      address,
      city,
      state,
      zip_code,
      arbox_customer_id,
      country: 'IL' // Israel
    }])
    .select()
    .single();

  if (error) {
    throw new AppError('Failed to create customer', 500);
  }

  // Log audit trail
  await supabaseAdmin
    .from('audit_log')
    .insert([{
      customer_id: customer.id,
      event_type: 'customer_created',
      event_data: { customer_id: customer.id },
      user_id: req.userId
    }]);

  res.status(201).json({
    success: true,
    message: 'לקוח נוצר בהצלחה', // "Customer created successfully" in Hebrew
    data: customer
  });
});

/**
 * Update customer
 * PUT /api/customers/:id
 */
exports.updateCustomer = catchAsync(async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  // Remove fields that shouldn't be updated
  delete updates.id;
  delete updates.created_at;
  delete updates.total_documents_sent;
  delete updates.total_documents_signed;

  const { data: customer, error } = await supabaseAdmin
    .from('customers')
    .update(updates)
    .eq('id', id)
    .is('deleted_at', null)
    .select()
    .single();

  if (error || !customer) {
    throw new AppError('לקוח לא נמצא', 404); // "Customer not found" in Hebrew
  }

  // Log audit trail
  await supabaseAdmin
    .from('audit_log')
    .insert([{
      customer_id: id,
      event_type: 'customer_updated',
      event_data: { updates },
      user_id: req.userId
    }]);

  res.json({
    success: true,
    message: 'לקוח עודכן בהצלחה', // "Customer updated successfully" in Hebrew
    data: customer
  });
});

/**
 * Delete customer (soft delete)
 * DELETE /api/customers/:id
 */
exports.deleteCustomer = catchAsync(async (req, res) => {
  const { id } = req.params;

  const { data: customer, error } = await supabaseAdmin
    .from('customers')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id)
    .is('deleted_at', null)
    .select()
    .single();

  if (error || !customer) {
    throw new AppError('לקוח לא נמצא', 404); // "Customer not found" in Hebrew
  }

  // Log audit trail
  await supabaseAdmin
    .from('audit_log')
    .insert([{
      customer_id: id,
      event_type: 'customer_deleted',
      event_data: { customer_id: id },
      user_id: req.userId
    }]);

  res.json({
    success: true,
    message: 'לקוח נמחק בהצלחה' // "Customer deleted successfully" in Hebrew
  });
});

/**
 * Sync customers from Arbox
 * POST /api/customers/sync-from-arbox
 * Returns immediately and processes in background to avoid Heroku's 30s timeout
 */
exports.syncFromArbox = catchAsync(async (req, res) => {
  const userId = req.userId;
  console.log('🔄 Starting Arbox sync...');

  // Return response immediately
  res.json({
    success: true,
    message: 'סנכרון התחיל, הנתונים יתעדכנו בקרוב',
    data: { status: 'processing' }
  });

  // Process sync in background
  setImmediate(async () => {
    try {
      // Fetch customers from Arbox
      const arboxCustomers = await arboxService.syncAllUsers();
      console.log(`📥 Fetched ${arboxCustomers.length} customers from Arbox`);

      if (arboxCustomers.length === 0) {
        console.log('ℹ️  No customers to sync');
        return;
      }

      // Get all existing customers with arbox IDs
      const existingArboxIds = arboxCustomers
        .map(c => c.arbox_customer_id)
        .filter(Boolean);

      const { data: existingCustomers } = await supabaseAdmin
        .from('customers')
        .select('id, arbox_customer_id')
        .in('arbox_customer_id', existingArboxIds)
        .is('deleted_at', null);

      const existingMap = new Map(
        (existingCustomers || []).map(c => [c.arbox_customer_id, c.id])
      );

      // Separate into create and update batches
      const toCreate = [];
      const toUpdate = [];

      for (const customerData of arboxCustomers) {
        if (!customerData.arbox_customer_id) {
          console.warn('⚠️  Skipping customer without arbox_customer_id');
          continue;
        }

        const existingId = existingMap.get(customerData.arbox_customer_id);
        if (existingId) {
          toUpdate.push({ ...customerData, id: existingId });
        } else {
          toCreate.push(customerData);
        }
      }

      console.log(`📊 To create: ${toCreate.length}, To update: ${toUpdate.length}`);

      let created = 0;
      let updated = 0;
      let errors = 0;

      // Bulk insert new customers
      if (toCreate.length > 0) {
        const { data, error } = await supabaseAdmin
          .from('customers')
          .insert(toCreate)
          .select();

        if (error) {
          console.error('❌ Error creating customers:', error);
          errors += toCreate.length;
        } else {
          created = data?.length || 0;
          console.log(`✅ Created ${created} customers`);
        }
      }

      // Bulk update existing customers (in batches of 50)
      if (toUpdate.length > 0) {
        const batchSize = 50;
        for (let i = 0; i < toUpdate.length; i += batchSize) {
          const batch = toUpdate.slice(i, i + batchSize);

          for (const customer of batch) {
            const { id, ...updateData } = customer;
            const { error } = await supabaseAdmin
              .from('customers')
              .update(updateData)
              .eq('id', id);

            if (error) {
              console.error(`❌ Error updating customer ${id}:`, error);
              errors++;
            } else {
              updated++;
            }
          }
        }
        console.log(`✅ Updated ${updated} customers`);
      }

      // Log audit trail
      await supabaseAdmin
        .from('audit_log')
        .insert([{
          event_type: 'arbox_sync_completed',
          event_data: { total: arboxCustomers.length, created, updated, errors },
          user_id: userId
        }]);

      console.log(`✅ Sync completed: ${created} created, ${updated} updated, ${errors} errors`);
    } catch (error) {
      console.error('❌ Background sync failed:', error);
    }
  });
});

/**
 * Get customer document status summary
 * GET /api/customers/:id/document-status
 */
exports.getDocumentStatus = catchAsync(async (req, res) => {
  const { id } = req.params;

  const { data: summary } = await supabaseAdmin
    .from('customer_document_summary')
    .select('*')
    .eq('customer_id', id)
    .single();

  if (!summary) {
    throw new AppError('לקוח לא נמצא', 404);
  }

  res.json({
    success: true,
    data: summary
  });
});

/**
 * Get customer activity timeline
 * GET /api/customers/:id/activity
 */
exports.getCustomerActivity = catchAsync(async (req, res) => {
  const { id } = req.params;

  const { data: activities, error } = await supabaseAdmin
    .from('audit_log')
    .select('*')
    .eq('customer_id', id)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    throw new AppError('Failed to fetch activity', 500);
  }

  res.json({
    success: true,
    data: activities
  });
});

/**
 * Get signed documents for a customer
 * GET /api/customers/:id/signed-documents
 */
exports.getSignedDocuments = catchAsync(async (req, res) => {
  const { id } = req.params;

  // Get all form requests with their signed documents
  const { data: formRequests, error } = await supabaseAdmin
    .from('form_requests')
    .select(`
      id,
      status,
      created_at,
      signed_at,
      template:form_templates(id, template_name, description),
      signed_document:signed_documents(id, file_url, file_path, file_size, created_at)
    `)
    .eq('customer_id', id)
    .eq('status', 'signed')
    .order('signed_at', { ascending: false });

  if (error) {
    console.error('Error fetching signed documents:', error);
    throw new AppError('שגיאה בטעינת מסמכים חתומים', 500);
  }

  // Flatten the data to extract signed documents
  // Note: signed_document comes as an array from Supabase joins
  const signedDocuments = formRequests
    .filter(fr => fr.signed_document && fr.signed_document.length > 0)
    .map(fr => {
      const doc = Array.isArray(fr.signed_document) ? fr.signed_document[0] : fr.signed_document;
      return {
        id: doc.id,
        form_request_id: fr.id,
        template_name: fr.template?.template_name || 'מסמך',
        template_description: fr.template?.description,
        file_url: doc.file_url,
        file_path: doc.file_path,
        file_size: doc.file_size,
        signed_at: fr.signed_at,
        created_at: doc.created_at
      };
    });

  res.json({
    success: true,
    data: signedDocuments
  });
});

/**
 * Download signed document
 * GET /api/customers/:customerId/signed-documents/:documentId/download
 */
exports.downloadSignedDocument = catchAsync(async (req, res) => {
  const { customerId, documentId } = req.params;

  // Get the signed document with form request
  const { data: signedDoc, error } = await supabaseAdmin
    .from('signed_documents')
    .select(`
      id,
      file_path,
      file_size,
      created_at,
      form_request:form_requests(id, customer_id)
    `)
    .eq('id', documentId)
    .single();

  if (error || !signedDoc) {
    throw new AppError('מסמך לא נמצא', 404);
  }

  // Verify the document belongs to this customer
  if (signedDoc.form_request.customer_id !== customerId) {
    throw new AppError('אין הרשאה לגשת למסמך זה', 403);
  }

  // Download file from Supabase storage
  const { data: fileData, error: downloadError } = await supabaseAdmin.storage
    .from('signed-documents')
    .download(signedDoc.file_path);

  if (downloadError) {
    console.error('Error downloading file:', downloadError);
    throw new AppError('שגיאה בהורדת המסמך', 500);
  }

  // Convert blob to buffer
  const buffer = Buffer.from(await fileData.arrayBuffer());

  // Set headers
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="${signedDoc.file_path.split('/').pop()}"`);
  res.setHeader('Content-Length', buffer.length);

  // Send file
  res.send(buffer);
});
