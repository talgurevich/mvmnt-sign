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
 * POST /api/customers/sync
 */
exports.syncFromArbox = catchAsync(async (req, res) => {
  // Fetch customers from Arbox
  const arboxCustomers = await arboxService.syncAllUsers();

  let created = 0;
  let updated = 0;
  let errors = 0;

  // Upsert each customer
  for (const customerData of arboxCustomers) {
    try {
      // Check if customer exists
      const { data: existing } = await supabaseAdmin
        .from('customers')
        .select('id')
        .eq('arbox_customer_id', customerData.arbox_customer_id)
        .single();

      if (existing) {
        // Update existing customer
        await supabaseAdmin
          .from('customers')
          .update(customerData)
          .eq('id', existing.id);
        updated++;
      } else {
        // Create new customer
        await supabaseAdmin
          .from('customers')
          .insert([customerData]);
        created++;
      }
    } catch (err) {
      console.error('Error syncing customer:', err);
      errors++;
    }
  }

  // Log audit trail
  await supabaseAdmin
    .from('audit_log')
    .insert([{
      event_type: 'arbox_sync_completed',
      event_data: { created, updated, errors },
      user_id: req.userId
    }]);

  res.json({
    success: true,
    message: 'סנכרון הושלם', // "Sync completed" in Hebrew
    data: {
      total: arboxCustomers.length,
      created,
      updated,
      errors
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
