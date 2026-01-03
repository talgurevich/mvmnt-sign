/**
 * Automations Controller
 * Manage automation settings (on/off toggles)
 */

const { supabaseAdmin } = require('../config/supabase');
const { catchAsync } = require('../middleware/errorHandler');
const arboxService = require('../services/arboxService');

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

/**
 * Get expiring memberships
 * GET /api/automations/membership-expiry/members
 */
exports.getExpiringMemberships = catchAsync(async (req, res) => {
  const { days = 7 } = req.query;
  const windowDays = parseInt(days, 10) || 7;

  // Fetch all users from Arbox
  const users = await arboxService.getUsers();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const windowEnd = new Date(today);
  windowEnd.setDate(windowEnd.getDate() + windowDays);

  // Filter users with expiring memberships
  const expiringMembers = users
    .filter(user => {
      if (!user.end) return false;
      const endDate = new Date(user.end);
      endDate.setHours(0, 0, 0, 0);
      return endDate >= today && endDate <= windowEnd;
    })
    .map(user => {
      const endDate = new Date(user.end);
      endDate.setHours(0, 0, 0, 0);
      const diffTime = endDate.getTime() - today.getTime();
      const daysUntilExpiry = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      return {
        id: user.id,
        userFk: user.user_fk,
        firstName: user.first_name || '',
        lastName: user.last_name || '',
        fullName: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
        phone: user.phone || '',
        email: user.email || '',
        membershipType: user.membership_type_name || '',
        membershipEnd: user.end,
        daysUntilExpiry,
        formattedEndDate: new Date(user.end).toLocaleDateString('he-IL', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        })
      };
    })
    .sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);

  res.json({
    success: true,
    data: {
      members: expiringMembers,
      count: expiringMembers.length,
      windowDays
    }
  });
});

/**
 * Get new memberships (started in last X days)
 * GET /api/automations/new-memberships/members
 */
exports.getNewMemberships = catchAsync(async (req, res) => {
  const { days = 7 } = req.query;
  const lookbackDays = parseInt(days, 10) || 7;

  // Fetch all users from Arbox
  const users = await arboxService.getUsers();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const lookbackDate = new Date(today);
  lookbackDate.setDate(lookbackDate.getDate() - lookbackDays);

  // Filter users with new memberships (started within lookback window)
  const newMembers = users
    .filter(user => {
      if (!user.start || !user.membership_type_name) return false;
      const startDate = new Date(user.start);
      startDate.setHours(0, 0, 0, 0);
      return startDate >= lookbackDate && startDate <= today;
    })
    .map(user => {
      const startDate = new Date(user.start);
      startDate.setHours(0, 0, 0, 0);
      const diffTime = today.getTime() - startDate.getTime();
      const daysSinceStart = Math.floor(diffTime / (1000 * 60 * 60 * 24));

      return {
        id: user.id,
        userFk: user.user_fk,
        firstName: user.first_name || '',
        lastName: user.last_name || '',
        fullName: `${user.first_name || ''} ${user.last_name || ''}`.trim(),
        phone: user.phone || '',
        email: user.email || '',
        membershipType: user.membership_type_name || '',
        membershipStart: user.start,
        membershipEnd: user.end,
        daysSinceStart,
        formattedStartDate: new Date(user.start).toLocaleDateString('he-IL', {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        })
      };
    })
    .sort((a, b) => new Date(b.membershipStart) - new Date(a.membershipStart)); // Most recent first

  res.json({
    success: true,
    data: {
      members: newMembers,
      count: newMembers.length,
      lookbackDays
    }
  });
});
