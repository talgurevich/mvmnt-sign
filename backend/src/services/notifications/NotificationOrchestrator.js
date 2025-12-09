/**
 * NotificationOrchestrator
 * Coordinates event detection and notification delivery
 */

const { supabaseAdmin } = require('../../config/supabase');
const StateManager = require('./StateManager');
const WaitlistCapacityDetector = require('./detectors/WaitlistCapacityDetector');
const BirthdayDetector = require('./detectors/BirthdayDetector');
const NewLeadDetector = require('./detectors/NewLeadDetector');
const EmailChannel = require('./channels/EmailChannel');

class NotificationOrchestrator {
  constructor() {
    this.stateManager = new StateManager();

    // Register detectors
    this.detectors = {
      waitlist_capacity: new WaitlistCapacityDetector(this.stateManager),
      birthday_notifications: new BirthdayDetector(this.stateManager),
      new_lead_notifications: new NewLeadDetector(this.stateManager)
    };

    // Register channels
    this.channels = {
      email: new EmailChannel()
    };
  }

  /**
   * Run all detectors and send notifications
   * @param {string[]} detectorNames - Which detectors to run (default: all)
   */
  async run(detectorNames = null) {
    const jobRun = await this.startJobRun('notification_orchestrator');

    try {
      const detectorsToRun = detectorNames
        ? detectorNames.filter(name => this.detectors[name])
        : Object.keys(this.detectors);

      let totalEventsDetected = 0;
      let totalNotificationsSent = 0;

      for (const detectorName of detectorsToRun) {
        console.log(`\n[Orchestrator] Running detector: ${detectorName}`);
        const detector = this.detectors[detectorName];

        // Detect events
        const notifications = await detector.detect();
        totalEventsDetected += notifications.length;

        console.log(`[Orchestrator] ${detectorName}: Detected ${notifications.length} events`);

        // Send notifications
        for (const notification of notifications) {
          const sentCount = await this.sendNotification(notification);
          totalNotificationsSent += sentCount;
        }
      }

      await this.completeJobRun(jobRun.id, {
        status: 'completed',
        events_detected: totalEventsDetected,
        notifications_sent: totalNotificationsSent
      });

      return {
        success: true,
        eventsDetected: totalEventsDetected,
        notificationsSent: totalNotificationsSent
      };

    } catch (error) {
      console.error('[Orchestrator] Error:', error);
      await this.completeJobRun(jobRun.id, {
        status: 'failed',
        error_message: error.message
      });
      throw error;
    }
  }

  /**
   * Send notification to admin recipients
   */
  async sendNotification(notification) {
    let sentCount = 0;

    // Get admin recipients for this event type
    const adminRecipients = await this.getAdminRecipients(notification.eventType);

    if (adminRecipients.length === 0) {
      console.warn(`[Orchestrator] No admin recipients configured for ${notification.eventType}`);

      // Fallback to env var
      const fallbackEmail = process.env.ADMIN_NOTIFICATION_EMAIL;
      if (fallbackEmail) {
        adminRecipients.push({ email: fallbackEmail, name: 'Admin' });
      }
    }

    for (const recipient of adminRecipients) {
      // Determine which channels to use
      const channelsToUse = this.determineChannels(recipient);

      for (const channelName of channelsToUse) {
        const channel = this.channels[channelName];
        if (!channel || !channel.isConfigured()) {
          console.warn(`[Orchestrator] Channel ${channelName} not configured`);
          continue;
        }

        // Create history record
        const historyRecord = await this.createHistoryRecord(
          notification,
          recipient,
          channelName
        );

        try {
          // Send notification
          const result = await channel.send(recipient, notification);

          // Update history
          await this.updateHistoryRecord(historyRecord.id, {
            status: result.success ? 'sent' : 'failed',
            external_id: result.externalId,
            error_message: result.error,
            sent_at: result.success ? new Date().toISOString() : null
          });

          if (result.success) sentCount++;

        } catch (error) {
          console.error(`[Orchestrator] Failed to send via ${channelName}:`, error.message);
          await this.updateHistoryRecord(historyRecord.id, {
            status: 'failed',
            error_message: error.message
          });
        }
      }
    }

    return sentCount;
  }

  /**
   * Get admin recipients for an event type
   */
  async getAdminRecipients(eventType) {
    const { data, error } = await supabaseAdmin
      .from('notification_admin_recipients')
      .select('*')
      .eq('is_active', true)
      .contains('event_types', [eventType]);

    if (error) {
      console.error('[Orchestrator] Error fetching admin recipients:', error);
      return [];
    }

    return data || [];
  }

  /**
   * Determine which channels to use for a recipient
   */
  determineChannels(recipient) {
    const channels = [];

    // Use email if available
    if (recipient.email) {
      channels.push('email');
    }

    return channels;
  }

  /**
   * Create notification history record
   */
  async createHistoryRecord(notification, recipient, channel) {
    const { data, error } = await supabaseAdmin
      .from('notification_history')
      .insert({
        event_type: notification.eventType,
        event_id: notification.entityId?.toString(),
        entity_key: notification.entityKey,
        subscriber_id: recipient.id?.toString(),
        recipient_email: recipient.email,
        recipient_phone: recipient.phone,
        channel,
        notification_type: notification.type,
        subject: `${notification.data.eventName} - ${notification.data.sessionDate}`,
        message: JSON.stringify(notification.data),
        metadata: notification.metadata,
        status: 'pending'
      })
      .select()
      .single();

    if (error) {
      console.error('[Orchestrator] Error creating history record:', error);
      throw error;
    }
    return data;
  }

  /**
   * Update notification history record
   */
  async updateHistoryRecord(id, updates) {
    const { error } = await supabaseAdmin
      .from('notification_history')
      .update(updates)
      .eq('id', id);

    if (error) {
      console.error('[Orchestrator] Error updating history record:', error);
    }
  }

  /**
   * Start a job run record
   */
  async startJobRun(jobName) {
    const { data, error } = await supabaseAdmin
      .from('notification_job_runs')
      .insert({
        job_name: jobName,
        status: 'running'
      })
      .select()
      .single();

    if (error) {
      console.error('[Orchestrator] Error creating job run:', error);
      // Return a mock object so we can continue
      return { id: null };
    }
    return data;
  }

  /**
   * Complete a job run record
   */
  async completeJobRun(id, updates) {
    if (!id) return;

    const { error } = await supabaseAdmin
      .from('notification_job_runs')
      .update({
        ...updates,
        completed_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      console.error('[Orchestrator] Error completing job run:', error);
    }
  }
}

module.exports = NotificationOrchestrator;
