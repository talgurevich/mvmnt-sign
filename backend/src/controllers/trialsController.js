/**
 * Trials Controller
 * Handles trial session data from Arbox API
 */

const arboxService = require('../services/arboxService');
const { catchAsync } = require('../middleware/errorHandler');

/**
 * Get upcoming trials for the next N days
 * GET /api/trials?days=7
 */
exports.getTrials = catchAsync(async (req, res) => {
  const days = parseInt(req.query.days) || 7;

  // Calculate date range
  const today = new Date();
  const endDate = new Date();
  endDate.setDate(today.getDate() + days);

  const fromDate = today.toISOString().split('T')[0];
  const toDate = endDate.toISOString().split('T')[0];

  console.log(`Fetching trials from ${fromDate} to ${toDate}`);

  const trials = await arboxService.getTrials(fromDate, toDate);

  // Filter to only upcoming trials (date >= today)
  const todayStr = today.toISOString().split('T')[0];
  const upcomingTrials = trials.filter(trial => trial.date >= todayStr);

  // Sort by date and time
  upcomingTrials.sort((a, b) => {
    const dateCompare = a.date.localeCompare(b.date);
    if (dateCompare !== 0) return dateCompare;
    return (a.time || '').localeCompare(b.time || '');
  });

  // Group by date
  const todayTrials = [];
  const tomorrowTrials = [];
  const laterTrials = [];

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  upcomingTrials.forEach(trial => {
    const trialData = {
      id: trial.id,
      odayuser_fk: trial.user_fk,
      firstName: trial.first_name || '',
      lastName: trial.last_name || '',
      fullName: `${trial.first_name || ''} ${trial.last_name || ''}`.trim(),
      phone: trial.phone || '',
      email: trial.email || '',
      date: trial.date,
      time: trial.time,
      className: trial.name,
      coach: trial.coach,
      coachPhone: trial.coach_phone,
      location: trial.location,
      status: trial.status,
      checkedIn: trial.checked_in === 1,
      source: trial.bs_name,
      leadOwner: trial.lead_owner_first_name
        ? `${trial.lead_owner_first_name} ${trial.lead_owner_last_name || ''}`.trim()
        : null,
      scheduleId: trial.schedule_id,
      createdAt: trial.created_at
    };

    if (trial.date === todayStr) {
      todayTrials.push({ ...trialData, isToday: true });
    } else if (trial.date === tomorrowStr) {
      tomorrowTrials.push({ ...trialData, isTomorrow: true });
    } else {
      // Calculate days until trial
      const trialDate = new Date(trial.date);
      const daysUntil = Math.ceil((trialDate - today) / (1000 * 60 * 60 * 24));
      laterTrials.push({ ...trialData, daysUntil });
    }
  });

  res.json({
    success: true,
    dateRange: { from: fromDate, to: toDate },
    summary: {
      today: todayTrials.length,
      tomorrow: tomorrowTrials.length,
      later: laterTrials.length,
      total: upcomingTrials.length
    },
    data: {
      today: todayTrials,
      tomorrow: tomorrowTrials,
      later: laterTrials
    }
  });
});

/**
 * Get trials needing reminder (within next N hours)
 * GET /api/trials/reminders?hours=10
 */
exports.getTrialsNeedingReminder = catchAsync(async (req, res) => {
  const hours = parseInt(req.query.hours) || 10;

  // Get trials for next 2 days to ensure we catch all
  const today = new Date();
  const endDate = new Date();
  endDate.setDate(today.getDate() + 2);

  const fromDate = today.toISOString().split('T')[0];
  const toDate = endDate.toISOString().split('T')[0];

  const trials = await arboxService.getTrials(fromDate, toDate);

  // Calculate which trials are within the reminder window
  const now = new Date();
  const reminderWindow = new Date(now.getTime() + hours * 60 * 60 * 1000);

  const trialsNeedingReminder = trials.filter(trial => {
    // Parse trial datetime
    const trialDateTime = new Date(`${trial.date}T${trial.time}`);

    // Check if trial is in the future and within reminder window
    return trialDateTime > now && trialDateTime <= reminderWindow;
  });

  res.json({
    success: true,
    reminderWindowHours: hours,
    trials: trialsNeedingReminder.map(trial => ({
      id: trial.id,
      fullName: `${trial.first_name || ''} ${trial.last_name || ''}`.trim(),
      phone: trial.phone,
      email: trial.email,
      date: trial.date,
      time: trial.time,
      className: trial.name,
      coach: trial.coach,
      location: trial.location
    }))
  });
});
