/**
 * Notifications Controller
 * Admin endpoints for managing and viewing notifications
 */

const { supabaseAdmin } = require('../config/supabase');
const { catchAsync } = require('../middleware/errorHandler');
const NotificationOrchestrator = require('../services/notifications/NotificationOrchestrator');

/**
 * Get notification history
 * GET /api/notifications/history
 */
exports.getHistory = catchAsync(async (req, res) => {
  const { limit = 50, offset = 0, status, event_type } = req.query;

  let query = supabaseAdmin
    .from('notification_history')
    .select('*', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (status) {
    query = query.eq('status', status);
  }

  if (event_type) {
    query = query.eq('event_type', event_type);
  }

  const { data, error, count } = await query;

  if (error) throw error;

  res.json({
    success: true,
    data,
    pagination: {
      total: count,
      limit: parseInt(limit),
      offset: parseInt(offset)
    }
  });
});

/**
 * Get job run history
 * GET /api/notifications/jobs
 */
exports.getJobRuns = catchAsync(async (req, res) => {
  const { limit = 20 } = req.query;

  const { data, error } = await supabaseAdmin
    .from('notification_job_runs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(limit);

  if (error) throw error;

  res.json({
    success: true,
    data
  });
});

/**
 * Trigger a test notification run
 * POST /api/notifications/test
 */
exports.triggerTestRun = catchAsync(async (req, res) => {
  const orchestrator = new NotificationOrchestrator();

  console.log('[NotificationsController] Triggering test run...');

  const result = await orchestrator.run();

  res.json({
    success: true,
    message: 'Test run completed',
    result
  });
});

/**
 * Get admin recipients
 * GET /api/notifications/recipients
 */
exports.getRecipients = catchAsync(async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('notification_admin_recipients')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;

  res.json({
    success: true,
    data
  });
});

/**
 * Add admin recipient
 * POST /api/notifications/recipients
 */
exports.addRecipient = catchAsync(async (req, res) => {
  const { email, name, event_types = ['waitlist_capacity'] } = req.body;

  if (!email) {
    return res.status(400).json({
      success: false,
      error: 'Email is required'
    });
  }

  const { data, error } = await supabaseAdmin
    .from('notification_admin_recipients')
    .insert({
      email,
      name,
      event_types,
      is_active: true
    })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') { // unique violation
      return res.status(400).json({
        success: false,
        error: 'Email already exists'
      });
    }
    throw error;
  }

  res.json({
    success: true,
    data
  });
});

/**
 * Update admin recipient
 * PUT /api/notifications/recipients/:id
 */
exports.updateRecipient = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { email, name, event_types, is_active } = req.body;

  const updates = {};
  if (email !== undefined) updates.email = email;
  if (name !== undefined) updates.name = name;
  if (event_types !== undefined) updates.event_types = event_types;
  if (is_active !== undefined) updates.is_active = is_active;
  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabaseAdmin
    .from('notification_admin_recipients')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  res.json({
    success: true,
    data
  });
});

/**
 * Delete admin recipient
 * DELETE /api/notifications/recipients/:id
 */
exports.deleteRecipient = catchAsync(async (req, res) => {
  const { id } = req.params;

  const { error } = await supabaseAdmin
    .from('notification_admin_recipients')
    .delete()
    .eq('id', id);

  if (error) throw error;

  res.json({
    success: true,
    message: 'Recipient deleted'
  });
});

/**
 * Get current state for debugging
 * GET /api/notifications/state
 */
exports.getState = catchAsync(async (req, res) => {
  const { event_type = 'waitlist_capacity' } = req.query;

  const { data, error } = await supabaseAdmin
    .from('notification_event_state')
    .select('*')
    .eq('event_type', event_type)
    .order('last_checked_at', { ascending: false });

  if (error) throw error;

  res.json({
    success: true,
    data
  });
});

/**
 * Clear state for fresh start
 * DELETE /api/notifications/state
 */
exports.clearState = catchAsync(async (req, res) => {
  const { event_type } = req.query;

  if (!event_type) {
    return res.status(400).json({
      success: false,
      error: 'event_type is required'
    });
  }

  const { error } = await supabaseAdmin
    .from('notification_event_state')
    .delete()
    .eq('event_type', event_type);

  if (error) throw error;

  res.json({
    success: true,
    message: `State cleared for ${event_type}`
  });
});
