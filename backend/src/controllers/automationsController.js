/**
 * Automations Controller
 * Manage automation settings (on/off toggles)
 */

const { supabaseAdmin } = require('../config/supabase');
const { catchAsync } = require('../middleware/errorHandler');

/**
 * Get all automation settings
 * GET /api/automations
 */
exports.getAutomations = catchAsync(async (req, res) => {
  const { data, error } = await supabaseAdmin
    .from('automation_settings')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) throw error;

  res.json({
    success: true,
    data
  });
});

/**
 * Get a single automation setting
 * GET /api/automations/:id
 */
exports.getAutomation = catchAsync(async (req, res) => {
  const { id } = req.params;

  const { data, error } = await supabaseAdmin
    .from('automation_settings')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return res.status(404).json({
        success: false,
        error: 'Automation not found'
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
 * Toggle automation on/off
 * PATCH /api/automations/:id/toggle
 */
exports.toggleAutomation = catchAsync(async (req, res) => {
  const { id } = req.params;

  // Get current state
  const { data: current, error: fetchError } = await supabaseAdmin
    .from('automation_settings')
    .select('is_enabled')
    .eq('id', id)
    .single();

  if (fetchError) {
    if (fetchError.code === 'PGRST116') {
      return res.status(404).json({
        success: false,
        error: 'Automation not found'
      });
    }
    throw fetchError;
  }

  // Toggle the state
  const newState = !current.is_enabled;

  const { data, error } = await supabaseAdmin
    .from('automation_settings')
    .update({
      is_enabled: newState,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;

  console.log(`[Automations] ${id} toggled to ${newState ? 'ON' : 'OFF'}`);

  res.json({
    success: true,
    data,
    message: newState ? 'האוטומציה הופעלה' : 'האוטומציה כובתה'
  });
});

/**
 * Update automation settings
 * PUT /api/automations/:id
 */
exports.updateAutomation = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { is_enabled, config } = req.body;

  const updates = { updated_at: new Date().toISOString() };
  if (is_enabled !== undefined) updates.is_enabled = is_enabled;
  if (config !== undefined) updates.config = config;

  const { data, error } = await supabaseAdmin
    .from('automation_settings')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return res.status(404).json({
        success: false,
        error: 'Automation not found'
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
 * Check if a specific automation is enabled
 * Used internally by scheduler jobs
 */
exports.isAutomationEnabled = async (automationId) => {
  const { data, error } = await supabaseAdmin
    .from('automation_settings')
    .select('is_enabled')
    .eq('id', automationId)
    .single();

  if (error) {
    console.error(`[Automations] Error checking ${automationId}:`, error.message);
    return false; // Default to disabled on error
  }

  return data?.is_enabled || false;
};

/**
 * Update last run timestamp
 */
exports.updateLastRun = async (automationId) => {
  await supabaseAdmin
    .from('automation_settings')
    .update({
      last_run_at: new Date().toISOString()
    })
    .eq('id', automationId);
};
