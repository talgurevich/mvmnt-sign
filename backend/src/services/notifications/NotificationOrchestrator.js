/**
 * NotificationOrchestrator
 * Coordinates event detection and notification delivery
 */

const { supabaseAdmin } = require('../../config/supabase');
const StateManager = require('./StateManager');
const WaitlistCapacityDetector = require('./detectors/WaitlistCapacityDetector');
const BirthdayDetector = require('./detectors/BirthdayDetector');
const NewLeadDetector = require('./detectors/NewLeadDetector');
const TrialDetector = require('./detectors/TrialDetector');
const MembershipExpiryDetector = require('./detectors/MembershipExpiryDetector');
const NewMembershipDetector = require('./detectors/NewMembershipDetector');
const EmailChannel = require('./channels/EmailChannel');
const WhatsAppChannel = require('./channels/WhatsAppChannel');
const GreenApiChannel = require('./channels/GreenApiChannel');

class NotificationOrchestrator {
  constructor() {
    this.stateManager = new StateManager();
    this.slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;

    // Register detectors
    this.detectors = {
      waitlist_capacity: new WaitlistCapacityDetector(this.stateManager),
      birthday_notifications: new BirthdayDetector(this.stateManager),
      new_lead_notifications: new NewLeadDetector(this.stateManager),
      trial_notifications: new TrialDetector(this.stateManager),
      membership_expiry_notifications: new MembershipExpiryDetector(this.stateManager),
      new_membership_notifications: new NewMembershipDetector(this.stateManager)
    };

    // Register channels
    // Use Green API for WhatsApp if configured, otherwise fall back to Twilio
    const whatsappChannel = process.env.GREEN_API_INSTANCE_ID
      ? new GreenApiChannel()
      : new WhatsAppChannel();

    this.channels = {
      email: new EmailChannel(),
      whatsapp: whatsappChannel
    };

    console.log(`[Orchestrator] WhatsApp provider: ${process.env.GREEN_API_INSTANCE_ID ? 'Green API' : 'Twilio'}`);
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

          if (result.success) {
            sentCount++;
            // Send Slack notification
            this.sendSlackNotification(notification, channelName, recipient).catch(err => {
              console.error('[Orchestrator] Slack notification failed:', err.message);
            });
          }

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

    // Use WhatsApp if phone is available
    if (recipient.phone) {
      channels.push('whatsapp');
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

  /**
   * Send Slack notification about sent message
   */
  async sendSlackNotification(notification, channel, recipient) {
    if (!this.slackWebhookUrl) return;

    const typeLabels = {
      'waitlist_spot_available': '✅ מקום פנוי',
      'birthday_today': '🎂 יום הולדת',
      'new_lead': '🆕 ליד חדש',
      'new_trial': '🏋️ אימון ניסיון',
      'trial_reminder': '⏰ תזכורת אימון',
      'membership_expiring': '⚠️ מנוי עומד לפוג',
      'new_membership': '🎉 מנוי חדש',
      'document_signed': '✍️ מסמך נחתם',
      'new_order': '🛍️ הזמנה חדשה'
    };

    const channelEmoji = channel === 'whatsapp' ? '📱' : '📧';
    const typeLabel = typeLabels[notification.type] || notification.type;
    const recipientInfo = channel === 'whatsapp' ? recipient.phone : recipient.email;

    // Build a summary from notification data
    let summary = '';
    const { data } = notification;

    if (notification.type === 'document_signed') {
      summary = `${data.customerName} - ${data.templateName}`;
    } else if (notification.type === 'birthday_today') {
      summary = `${data.birthdayCount} חוגגים`;
    } else if (notification.type === 'new_lead') {
      summary = data.leads?.[0]?.fullName || '';
    } else if (notification.type === 'new_trial' || notification.type === 'trial_reminder') {
      summary = data.trials?.[0]?.fullName || '';
    } else if (notification.type === 'membership_expiring') {
      summary = data.members?.[0]?.fullName || '';
    } else if (notification.type === 'new_membership') {
      summary = data.members?.[0]?.fullName || '';
    } else if (notification.type === 'waitlist_spot_available') {
      summary = `${data.eventName} - ${data.availableSpots} מקומות`;
    } else if (notification.type === 'new_order') {
      summary = `${data.customerName} - ${data.itemsCount} פריטים - ${data.totalAmount}₪`;
    }

    const slackMessage = {
      text: `${channelEmoji} ${typeLabel}`,
      blocks: [
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `${channelEmoji} *${typeLabel}*\n${summary}`
          }
        },
        {
          type: 'context',
          elements: [
            {
              type: 'mrkdwn',
              text: `נשלח ל: ${recipientInfo} | ${new Date().toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' })}`
            }
          ]
        }
      ]
    };

    try {
      const response = await fetch(this.slackWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(slackMessage)
      });

      if (!response.ok) {
        throw new Error(`Slack returned ${response.status}`);
      }

      console.log('[Orchestrator] Slack notification sent');
    } catch (error) {
      console.error('[Orchestrator] Slack error:', error.message);
    }
  }
}

module.exports = NotificationOrchestrator;
