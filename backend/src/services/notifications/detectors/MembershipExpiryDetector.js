/**
 * MembershipExpiryDetector
 * Detects memberships that are about to expire and sends reminder notifications
 */

const BaseDetector = require('./BaseDetector');
const arboxService = require('../../arboxService');

class MembershipExpiryDetector extends BaseDetector {
  constructor(stateManager) {
    super(stateManager);
    this.eventType = 'membership_expiry_notifications';
    // Notify when membership expires within this many days
    this.expiryWindowDays = 7;
    // Run window: 10:00-10:10 Israel time (same as birthdays)
    this.runHour = 10;
    this.runMinuteWindow = 10;
  }

  /**
   * Check if current time is within the 10 AM run window (Israel time)
   */
  isWithinRunWindow() {
    const israelTime = new Date().toLocaleString('en-US', { timeZone: 'Asia/Jerusalem' });
    const israelDate = new Date(israelTime);
    const hour = israelDate.getHours();
    const minute = israelDate.getMinutes();

    const isInWindow = hour === this.runHour && minute < this.runMinuteWindow;

    console.log(`[${this.eventType}] Israel time: ${israelDate.toLocaleTimeString('he-IL')}, Run window: ${this.runHour}:00-${this.runHour}:${this.runMinuteWindow}, In window: ${isInWindow}`);

    return isInWindow;
  }

  /**
   * Fetch users with membership data from Arbox
   */
  async fetchUsersData() {
    console.log(`[${this.eventType}] Fetching users from Arbox`);

    const users = await arboxService.getUsers();

    if (!Array.isArray(users) || users.length === 0) {
      console.log(`[${this.eventType}] No users found`);
      return [];
    }

    console.log(`[${this.eventType}] Found ${users.length} total users`);

    // Map to our format
    return users.map(user => ({
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
      isActive: user.active === 1
    }));
  }

  /**
   * Find users whose membership is expiring within the window
   */
  findExpiringMemberships(users) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const windowEnd = new Date(today);
    windowEnd.setDate(windowEnd.getDate() + this.expiryWindowDays);

    return users.filter(user => {
      if (!user.membershipEnd) return false;

      const endDate = new Date(user.membershipEnd);
      endDate.setHours(0, 0, 0, 0);

      // Check if expiring within window (not already expired)
      return endDate >= today && endDate <= windowEnd;
    });
  }

  /**
   * Calculate days until expiry
   */
  getDaysUntilExpiry(endDateStr) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endDate = new Date(endDateStr);
    endDate.setHours(0, 0, 0, 0);

    const diffTime = endDate.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  /**
   * Format date for display (Hebrew)
   */
  formatDate(dateStr) {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('he-IL', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  }

  /**
   * Detect expiring memberships
   * Only runs during 10 AM window (Israel time)
   */
  async detect() {
    const notifications = [];

    // Check if we're in the 10 AM run window
    if (!this.isWithinRunWindow()) {
      return notifications;
    }

    // Fetch all users
    const users = await this.fetchUsersData();
    if (users.length === 0) {
      return notifications;
    }

    // Find users with expiring memberships
    const expiringUsers = this.findExpiringMemberships(users);

    console.log(`[${this.eventType}] Found ${expiringUsers.length} users with memberships expiring in next ${this.expiryWindowDays} days`);

    if (expiringUsers.length === 0) {
      return notifications;
    }

    // Get stored state (previously notified user IDs)
    const entityKey = 'expiring_memberships';
    const previousState = await this.stateManager.getPreviousState(this.eventType, entityKey);

    const previouslyNotified = previousState?.state_data?.notifiedUserIds || [];
    const lastNotifiedDate = previousState?.state_data?.lastNotifiedDate;

    // Reset notifications daily - if last notification was a different day, clear the list
    const today = new Date().toISOString().split('T')[0];
    const shouldResetDaily = lastNotifiedDate !== today;

    if (shouldResetDaily) {
      console.log(`[${this.eventType}] New day - resetting notification state`);
    }

    const notifiedToday = shouldResetDaily ? [] : previouslyNotified;

    // Filter to only users we haven't notified today
    const newExpiringUsers = expiringUsers.filter(u => !notifiedToday.includes(u.id));

    console.log(`[${this.eventType}] Previously notified today: ${notifiedToday.length}, New to notify: ${newExpiringUsers.length}`);

    if (newExpiringUsers.length > 0) {
      // Enrich with days until expiry
      const enrichedUsers = newExpiringUsers.map(user => ({
        ...user,
        daysUntilExpiry: this.getDaysUntilExpiry(user.membershipEnd),
        formattedEndDate: this.formatDate(user.membershipEnd)
      }));

      // Sort by days until expiry (most urgent first)
      enrichedUsers.sort((a, b) => a.daysUntilExpiry - b.daysUntilExpiry);

      console.log(`[${this.eventType}] Detected ${enrichedUsers.length} expiring membership(s)`);

      notifications.push({
        type: 'membership_expiring',
        eventType: this.eventType,
        entityId: 'expiring_memberships',
        entityKey: `expiring_${Date.now()}`,
        recipients: enrichedUsers,
        data: {
          expiringCount: enrichedUsers.length,
          members: enrichedUsers,
          windowDays: this.expiryWindowDays,
          detectedAt: new Date().toISOString()
        },
        metadata: {
          detectedAt: new Date().toISOString(),
          windowDays: this.expiryWindowDays
        }
      });

      // Update notified list
      notifiedToday.push(...newExpiringUsers.map(u => u.id));
    }

    // Save state
    await this.stateManager.saveState(
      this.eventType,
      'expiring_memberships',
      entityKey,
      {
        notifiedUserIds: notifiedToday,
        lastNotifiedDate: today,
        lastChecked: new Date().toISOString()
      }
    );

    return notifications;
  }
}

module.exports = MembershipExpiryDetector;
