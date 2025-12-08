/**
 * Waitlist Controller
 * Handles Arbox waiting list data retrieval
 */

const arboxService = require('../services/arboxService');

/**
 * Get waiting list entries for the next N days
 * GET /api/waitlist?days=3
 */
exports.getWaitlist = async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 3;

    // Calculate date range
    const today = new Date();
    const endDate = new Date();
    endDate.setDate(today.getDate() + days);

    const startDateStr = today.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    console.log(`Fetching waitlist from ${startDateStr} to ${endDateStr}`);

    // Fetch waiting list from Arbox
    const response = await arboxService.client.get('/schedule/entryFromWaitingList', {
      params: { fDate: startDateStr, tDate: endDateStr }
    });

    const waitlistEntries = response.data || [];

    // Group entries by session (date + time + event_name)
    const sessionMap = {};

    waitlistEntries.forEach(entry => {
      const sessionKey = `${entry.date}_${entry.time}_${entry.event_name}`;

      if (!sessionMap[sessionKey]) {
        sessionMap[sessionKey] = {
          date: entry.date,
          time: entry.time,
          event_name: entry.event_name,
          coach: entry.coach,
          waitlist: []
        };
      }

      sessionMap[sessionKey].waitlist.push({
        id: entry.id,
        user_fk: entry.user_fk,
        name: entry.name,
        phone: entry.phone,
        entry_time: entry.entry_time
      });
    });

    // Convert to array and sort by date/time
    const sessions = Object.values(sessionMap).sort((a, b) => {
      // Parse dates in DD/MM/YYYY format
      const parseDate = (dateStr, timeStr) => {
        const [day, month, year] = dateStr.split('/');
        const [hours, minutes] = timeStr.split(':');
        return new Date(year, month - 1, day, hours, minutes);
      };

      const dateA = parseDate(a.date, a.time);
      const dateB = parseDate(b.date, b.time);
      return dateA - dateB;
    });

    res.json({
      success: true,
      dateRange: { from: startDateStr, to: endDateStr },
      totalWaiting: waitlistEntries.length,
      sessionsWithWaitlist: sessions.length,
      sessions
    });

  } catch (error) {
    console.error('Error fetching waitlist:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch waiting list',
      message: error.message
    });
  }
};

/**
 * Get waiting list statistics
 * GET /api/waitlist/stats
 */
exports.getWaitlistStats = async (req, res) => {
  try {
    // Get waitlist for next 7 days for stats
    const today = new Date();
    const endDate = new Date();
    endDate.setDate(today.getDate() + 7);

    const startDateStr = today.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    const response = await arboxService.client.get('/schedule/entryFromWaitingList', {
      params: { fDate: startDateStr, tDate: endDateStr }
    });

    const waitlistEntries = response.data || [];

    // Stats by event type
    const byEventType = {};
    const byDay = {};

    waitlistEntries.forEach(entry => {
      // Count by event type
      const eventName = entry.event_name || 'Unknown';
      byEventType[eventName] = (byEventType[eventName] || 0) + 1;

      // Count by day
      const day = entry.date;
      byDay[day] = (byDay[day] || 0) + 1;
    });

    // Convert to arrays and sort
    const eventTypeStats = Object.entries(byEventType)
      .map(([event, count]) => ({ event, count }))
      .sort((a, b) => b.count - a.count);

    const dailyStats = Object.entries(byDay)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => {
        // Parse DD/MM/YYYY format
        const parseDate = (dateStr) => {
          const [day, month, year] = dateStr.split('/');
          return new Date(year, month - 1, day);
        };
        return parseDate(a.date) - parseDate(b.date);
      });

    res.json({
      success: true,
      totalWaiting: waitlistEntries.length,
      byEventType: eventTypeStats,
      byDay: dailyStats
    });

  } catch (error) {
    console.error('Error fetching waitlist stats:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch waiting list statistics',
      message: error.message
    });
  }
};
