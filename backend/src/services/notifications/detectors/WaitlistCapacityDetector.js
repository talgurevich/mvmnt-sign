/**
 * WaitlistCapacityDetector
 * Detects when capacity opens up in sessions with waitlisted users
 */

const BaseDetector = require('./BaseDetector');
const arboxService = require('../../arboxService');

class WaitlistCapacityDetector extends BaseDetector {
  constructor(stateManager) {
    super(stateManager);
    this.eventType = 'waitlist_capacity';
  }

  /**
   * Format date as dd-mm-YYYY for Arbox API
   */
  formatDateForArbox(date) {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  }

  /**
   * Parse date from DD/MM/YYYY format
   */
  parseDDMMYYYY(dateStr) {
    const [day, month, year] = dateStr.split('/');
    return new Date(year, month - 1, day);
  }

  /**
   * Fetch current waitlist data with capacity info
   * Reuses logic from waitlistController
   */
  async fetchCurrentData() {
    const today = new Date();
    const endDate = new Date();
    endDate.setDate(today.getDate() + 3); // Check next 3 days

    const startDateStr = today.toISOString().split('T')[0];
    const endDateStr = endDate.toISOString().split('T')[0];

    console.log(`[${this.eventType}] Fetching data from ${startDateStr} to ${endDateStr}`);

    // Fetch both waitlist and schedule data in parallel
    const [waitlistResponse, scheduleResponse] = await Promise.all([
      arboxService.client.get('/schedule/entryFromWaitingList', {
        params: { fDate: startDateStr, tDate: endDateStr }
      }),
      arboxService.client.request({
        method: 'GET',
        url: '/schedule',
        data: {
          from: this.formatDateForArbox(today),
          to: this.formatDateForArbox(endDate),
          bookings: true
        }
      })
    ]);

    const waitlistEntries = waitlistResponse.data || [];
    const scheduleData = scheduleResponse.data?.data || scheduleResponse.data || [];

    console.log(`[${this.eventType}] Found ${waitlistEntries.length} waitlist entries, ${scheduleData.length} sessions`);

    // Create schedule map for capacity lookup
    const scheduleMap = {};
    scheduleData.forEach(session => {
      const date = session.date;
      const time = session.startTime?.substring(0, 5);
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
        const waitlistDate = this.parseDDMMYYYY(entry.date);
        const scheduleDate = waitlistDate.toISOString().split('T')[0];
        const scheduleKey = `${scheduleDate}_${entry.time}_${entry.event_name}`;
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

    return Object.values(sessionMap);
  }

  /**
   * Extract state data for comparison
   */
  extractStateData(session) {
    const entityId = session.schedule_id?.toString() || `${session.date}_${session.time}_${session.event_name}`;
    const entityKey = `${entityId}_${session.date}_${session.time}`;

    // State we care about for notifications
    const stateData = {
      availableSpots: session.availableSpots,
      hasAvailableSpot: session.hasAvailableSpot,
      waitlistCount: session.waitlist.length,
      waitlistUserIds: session.waitlist.map(w => w.user_fk).sort()
    };

    return { entityId, entityKey, stateData };
  }

  /**
   * Determine if this change warrants a notification
   */
  shouldNotify(comparison, session) {
    if (!comparison.hasChanged || comparison.isNew) {
      return false;
    }

    const before = comparison.previousState;
    const after = comparison.changes?.after;

    // Notify when: spots went from 0 to > 0 AND there are people waiting
    const spotsOpened = (before.availableSpots === 0 || !before.hasAvailableSpot) &&
                        (after.availableSpots > 0 && after.hasAvailableSpot);

    const hasWaitlist = session.waitlist.length > 0;

    if (spotsOpened && hasWaitlist) {
      console.log(`[${this.eventType}] Spots opened for ${session.event_name} on ${session.date} at ${session.time}: ${after.availableSpots} spots, ${session.waitlist.length} waiting`);
      return true;
    }

    return false;
  }

  /**
   * Build the notification payload
   */
  buildNotificationPayload(comparison, session) {
    // Get recipients from waitlist (sorted by entry_time - first come, first served)
    const sortedWaitlist = [...session.waitlist].sort(
      (a, b) => new Date(a.entry_time) - new Date(b.entry_time)
    );

    const recipients = sortedWaitlist.map((person, index) => ({
      id: person.user_fk,
      name: person.name,
      phone: person.phone,
      entryTime: person.entry_time,
      position: index + 1
    }));

    return {
      type: 'waitlist_spot_available',
      eventType: this.eventType,
      entityId: session.schedule_id,
      entityKey: `${session.schedule_id}_${session.date}_${session.time}`,
      recipients,
      data: {
        sessionDate: session.date,
        sessionTime: session.time,
        eventName: session.event_name,
        coach: session.coach,
        availableSpots: session.availableSpots,
        maxMembers: session.maxMembers,
        currentBookings: session.currentBookings,
        previousSpots: comparison.previousState?.availableSpots || 0
      },
      metadata: {
        detectedAt: new Date().toISOString(),
        totalWaitlistSize: session.waitlist.length
      }
    };
  }
}

module.exports = WaitlistCapacityDetector;
