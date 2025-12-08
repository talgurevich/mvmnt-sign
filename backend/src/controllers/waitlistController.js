/**
 * Waitlist Controller
 * Handles Arbox waiting list data retrieval with capacity checking
 */

const arboxService = require('../services/arboxService');

/**
 * Format date as dd-mm-YYYY for Arbox API
 */
const formatDateForArbox = (date) => {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}-${month}-${year}`;
};

/**
 * Parse date from DD/MM/YYYY format (waitlist response)
 */
const parseDDMMYYYY = (dateStr) => {
  const [day, month, year] = dateStr.split('/');
  return new Date(year, month - 1, day);
};

/**
 * Get waiting list entries for the next N days with capacity info
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

    // Fetch both waitlist and schedule data in parallel
    const [waitlistResponse, scheduleResponse] = await Promise.all([
      arboxService.client.get('/schedule/entryFromWaitingList', {
        params: { fDate: startDateStr, tDate: endDateStr }
      }),
      arboxService.client.request({
        method: 'GET',
        url: '/schedule',
        data: {
          from: formatDateForArbox(today),
          to: formatDateForArbox(endDate),
          bookings: true
        }
      })
    ]);

    const waitlistEntries = waitlistResponse.data || [];
    const scheduleData = scheduleResponse.data?.data || scheduleResponse.data || [];

    console.log(`Found ${waitlistEntries.length} waitlist entries, ${scheduleData.length} scheduled sessions`);

    // Create a map of schedule data by date+time+name for quick lookup
    const scheduleMap = {};
    scheduleData.forEach(session => {
      // Schedule date is in YYYY-MM-DD format, time is HH:mm:ss
      const date = session.date;
      const time = session.startTime?.substring(0, 5); // Get HH:mm
      const key = `${date}_${time}_${session.name}`;
      scheduleMap[key] = {
        id: session.id,
        maxMembers: session.maxMembers,
        bookings: session.bookings || 0,
        availableSpots: (session.maxMembers || 0) - (session.bookings || 0),
        isCancelled: session.isCancelled
      };
    });

    // Group waitlist entries by session
    const sessionMap = {};

    waitlistEntries.forEach(entry => {
      const sessionKey = `${entry.date}_${entry.time}_${entry.event_name}`;

      if (!sessionMap[sessionKey]) {
        // Convert waitlist date (DD/MM/YYYY) to schedule date format (YYYY-MM-DD) for matching
        const waitlistDate = parseDDMMYYYY(entry.date);
        const scheduleDate = waitlistDate.toISOString().split('T')[0];
        const scheduleKey = `${scheduleDate}_${entry.time}_${entry.event_name}`;

        // Look up capacity data from schedule
        const capacityData = scheduleMap[scheduleKey] || null;

        sessionMap[sessionKey] = {
          date: entry.date,
          time: entry.time,
          event_name: entry.event_name,
          coach: entry.coach,
          schedule_id: capacityData?.id || null,
          maxMembers: capacityData?.maxMembers || null,
          currentBookings: capacityData?.bookings || null,
          availableSpots: capacityData?.availableSpots || null,
          hasAvailableSpot: capacityData ? capacityData.availableSpots > 0 : null,
          isCancelled: capacityData?.isCancelled || false,
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
      const dateA = parseDDMMYYYY(a.date);
      const dateB = parseDDMMYYYY(b.date);
      if (dateA.getTime() !== dateB.getTime()) {
        return dateA - dateB;
      }
      return a.time.localeCompare(b.time);
    });

    // Count sessions with available spots
    const sessionsWithAvailableSpots = sessions.filter(s => s.hasAvailableSpot === true).length;

    res.json({
      success: true,
      dateRange: { from: startDateStr, to: endDateStr },
      totalWaiting: waitlistEntries.length,
      sessionsWithWaitlist: sessions.length,
      sessionsWithAvailableSpots,
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
        return parseDDMMYYYY(a.date) - parseDDMMYYYY(b.date);
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
