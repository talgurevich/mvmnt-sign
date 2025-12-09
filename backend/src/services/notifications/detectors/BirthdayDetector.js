/**
 * BirthdayDetector
 * Detects birthdays for active members and sends daily notification at 10 AM
 */

const BaseDetector = require('./BaseDetector');
const arboxService = require('../../arboxService');

class BirthdayDetector extends BaseDetector {
  constructor(stateManager) {
    super(stateManager);
    this.eventType = 'birthday_notifications';
    // Run window: 10:00-10:10 Israel time
    this.runHour = 10;
    this.runMinuteWindow = 10;
  }

  /**
   * Check if current time is within the 10 AM run window (Israel time)
   */
  isWithinRunWindow() {
    // Get current time in Israel
    const israelTime = new Date().toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' });
    const israelDate = new Date(israelTime);
    const hour = israelDate.getHours();
    const minute = israelDate.getMinutes();

    const isInWindow = hour === this.runHour && minute < this.runMinuteWindow;

    console.log(`[${this.eventType}] Israel time: ${israelDate.toLocaleTimeString('he-IL')}, Run window: ${this.runHour}:00-${this.runHour}:${this.runMinuteWindow}, In window: ${isInWindow}`);

    return isInWindow;
  }

  /**
   * Get today's date as a string key
   */
  getTodayKey() {
    const today = new Date();
    return today.toISOString().split('T')[0]; // YYYY-MM-DD
  }

  /**
   * Fetch users with birthdays today
   * Only runs during 10 AM window
   */
  async fetchCurrentData() {
    // Check if we're in the 10 AM run window
    if (!this.isWithinRunWindow()) {
      console.log(`[${this.eventType}] Outside run window (10:00-10:10 Israel time) - skipping`);
      return [];
    }
    console.log(`[${this.eventType}] Checking for birthdays today`);

    const users = await arboxService.getUsers();

    if (!Array.isArray(users)) {
      console.log(`[${this.eventType}] No users data returned`);
      return [];
    }

    const today = new Date();
    const todayMonth = today.getMonth();
    const todayDate = today.getDate();

    // Filter for active users with birthdays today
    const birthdaysToday = users.filter(user => {
      const birthDate = user.dateOfBirth || user.birthDate || user.birthday;
      if (!birthDate) return false;

      // Check if active
      const isActive = user.status === 'active' ||
                       user.isActive ||
                       user.activeMembership ||
                       (user.memberships && user.memberships.some(m => m.status === 'active'));
      if (!isActive) return false;

      // Check if birthday is today
      const bday = new Date(birthDate);
      if (isNaN(bday.getTime())) return false;

      return bday.getMonth() === todayMonth && bday.getDate() === todayDate;
    });

    console.log(`[${this.eventType}] Found ${birthdaysToday.length} birthdays today`);

    // Return as a single "entity" - today's birthdays
    if (birthdaysToday.length === 0) {
      return [];
    }

    return [{
      date: this.getTodayKey(),
      birthdays: birthdaysToday.map(user => {
        const birthDate = user.dateOfBirth || user.birthDate || user.birthday;
        const bday = new Date(birthDate);
        const turningAge = today.getFullYear() - bday.getFullYear();

        return {
          id: user.id,
          firstName: user.firstName || user.first_name || '',
          lastName: user.lastName || user.last_name || '',
          fullName: `${user.firstName || user.first_name || ''} ${user.lastName || user.last_name || ''}`.trim(),
          phone: user.phone || user.phoneNumber || '',
          email: user.email || '',
          turningAge
        };
      })
    }];
  }

  /**
   * Extract state data for comparison
   */
  extractStateData(entity) {
    const entityId = entity.date;
    const entityKey = `birthdays_${entity.date}`;

    // State: list of user IDs with birthdays today
    const stateData = {
      date: entity.date,
      birthdayCount: entity.birthdays.length,
      userIds: entity.birthdays.map(b => b.id).sort()
    };

    return { entityId, entityKey, stateData };
  }

  /**
   * Determine if we should send notification
   * Send once per day when there are birthdays
   */
  shouldNotify(comparison, entity) {
    // If this is the first time we're seeing today's date, and there are birthdays
    if (comparison.isNew && entity.birthdays.length > 0) {
      console.log(`[${this.eventType}] New day with ${entity.birthdays.length} birthdays - will notify`);
      return true;
    }

    // If we've already processed today, don't notify again
    if (!comparison.isNew) {
      console.log(`[${this.eventType}] Already notified for today`);
      return false;
    }

    return false;
  }

  /**
   * Build notification payload
   */
  buildNotificationPayload(comparison, entity) {
    return {
      type: 'birthday_today',
      eventType: this.eventType,
      entityId: entity.date,
      entityKey: `birthdays_${entity.date}`,
      recipients: entity.birthdays, // The birthday people (for reference, admin gets notified)
      data: {
        date: entity.date,
        formattedDate: new Date(entity.date).toLocaleDateString('he-IL', {
          weekday: 'long',
          day: 'numeric',
          month: 'long'
        }),
        birthdayCount: entity.birthdays.length,
        birthdays: entity.birthdays
      },
      metadata: {
        detectedAt: new Date().toISOString()
      }
    };
  }
}

module.exports = BirthdayDetector;
