/**
 * NewMembershipDetector
 * Detects new customers who have purchased a membership
 */

const BaseDetector = require('./BaseDetector');
const arboxService = require('../../arboxService');

class NewMembershipDetector extends BaseDetector {
  constructor(stateManager) {
    super(stateManager);
    this.eventType = 'new_membership_notifications';
    // Look for memberships that started in the last 7 days
    this.lookbackDays = 7;
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
   * Find users with memberships that started recently
   */
  findNewMemberships(users) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const lookbackDate = new Date(today);
    lookbackDate.setDate(lookbackDate.getDate() - this.lookbackDays);

    return users.filter(user => {
      if (!user.membershipStart || !user.membershipType) return false;

      const startDate = new Date(user.membershipStart);
      startDate.setHours(0, 0, 0, 0);

      // Check if membership started within lookback window
      return startDate >= lookbackDate && startDate <= today;
    });
  }

  /**
   * Calculate days since membership started
   */
  getDaysSinceStart(startDateStr) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startDate = new Date(startDateStr);
    startDate.setHours(0, 0, 0, 0);

    const diffTime = today.getTime() - startDate.getTime();
    return Math.floor(diffTime / (1000 * 60 * 60 * 24));
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
   * Detect new memberships
   */
  async detect() {
    const notifications = [];

    // Fetch all users
    const users = await this.fetchUsersData();
    if (users.length === 0) {
      return notifications;
    }

    // Find users with new memberships
    const newMemberships = this.findNewMemberships(users);

    console.log(`[${this.eventType}] Found ${newMemberships.length} new memberships in last ${this.lookbackDays} days`);

    if (newMemberships.length === 0) {
      return notifications;
    }

    // Get stored state (previously notified user IDs)
    const entityKey = 'new_memberships';
    const previousState = await this.stateManager.getPreviousState(this.eventType, entityKey);

    const previouslyNotified = previousState?.state_data?.notifiedUserIds || [];
    const currentMembershipIds = newMemberships.map(u => u.id);

    // FIRST RUN: If no previous state, just initialize without notifications
    if (!previousState) {
      console.log(`[${this.eventType}] First run - initializing state with ${currentMembershipIds.length} existing memberships (no notifications)`);

      await this.stateManager.saveState(
        this.eventType,
        'new_memberships',
        entityKey,
        {
          notifiedUserIds: currentMembershipIds,
          lastChecked: new Date().toISOString()
        }
      );

      return notifications;
    }

    // Filter to only users we haven't notified yet
    const newToNotify = newMemberships.filter(u => !previouslyNotified.includes(u.id));

    console.log(`[${this.eventType}] Previously notified: ${previouslyNotified.length}, New to notify: ${newToNotify.length}`);

    if (newToNotify.length > 0) {
      // Enrich with days since start
      const enrichedUsers = newToNotify.map(user => ({
        ...user,
        daysSinceStart: this.getDaysSinceStart(user.membershipStart),
        formattedStartDate: this.formatDate(user.membershipStart)
      }));

      // Sort by start date (most recent first)
      enrichedUsers.sort((a, b) => new Date(b.membershipStart) - new Date(a.membershipStart));

      console.log(`[${this.eventType}] Detected ${enrichedUsers.length} new membership(s)`);

      notifications.push({
        type: 'new_membership',
        eventType: this.eventType,
        entityId: 'new_memberships',
        entityKey: `new_memberships_${Date.now()}`,
        recipients: enrichedUsers,
        data: {
          memberCount: enrichedUsers.length,
          members: enrichedUsers,
          detectedAt: new Date().toISOString()
        },
        metadata: {
          detectedAt: new Date().toISOString(),
          lookbackDays: this.lookbackDays
        }
      });

      // Update notified list (keep all from current window + new ones)
      const updatedNotified = [...new Set([...previouslyNotified, ...newToNotify.map(u => u.id)])];

      // Clean up old IDs that are no longer in the current window
      const cleanedNotified = updatedNotified.filter(id => currentMembershipIds.includes(id));

      await this.stateManager.saveState(
        this.eventType,
        'new_memberships',
        entityKey,
        {
          notifiedUserIds: cleanedNotified,
          lastChecked: new Date().toISOString()
        }
      );
    } else {
      // Just update the state with current IDs (cleanup old ones)
      await this.stateManager.saveState(
        this.eventType,
        'new_memberships',
        entityKey,
        {
          notifiedUserIds: previouslyNotified.filter(id => currentMembershipIds.includes(id)),
          lastChecked: new Date().toISOString()
        }
      );
    }

    return notifications;
  }
}

module.exports = NewMembershipDetector;
