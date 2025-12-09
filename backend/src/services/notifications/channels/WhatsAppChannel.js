/**
 * WhatsAppChannel
 * Sends notifications via WhatsApp using Twilio API
 */

const BaseChannel = require('./BaseChannel');

class WhatsAppChannel extends BaseChannel {
  constructor() {
    super();
    this.channelName = 'whatsapp';
    this.accountSid = process.env.TWILIO_ACCOUNT_SID;
    this.authToken = process.env.TWILIO_AUTH_TOKEN;
    this.fromNumber = process.env.TWILIO_WHATSAPP_FROM;
  }

  /**
   * Check if channel is configured
   */
  isConfigured() {
    return !!(this.accountSid && this.authToken && this.fromNumber);
  }

  /**
   * Format phone number for WhatsApp
   */
  formatPhoneNumber(phone) {
    if (!phone) return null;

    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');

    // Handle Israeli numbers
    if (cleaned.startsWith('0')) {
      cleaned = '972' + cleaned.substring(1);
    }

    // Add whatsapp: prefix if not present
    if (!cleaned.startsWith('whatsapp:')) {
      cleaned = 'whatsapp:+' + cleaned;
    }

    return cleaned;
  }

  /**
   * Send a WhatsApp message via Twilio
   */
  async send(recipient, notification) {
    if (!this.isConfigured()) {
      console.warn('[WhatsAppChannel] Not configured - missing Twilio credentials');
      return { success: false, error: 'WhatsApp channel not configured' };
    }

    const toNumber = this.formatPhoneNumber(recipient.phone);
    if (!toNumber) {
      return { success: false, error: 'No phone number for recipient' };
    }

    const messageBody = this.renderTemplate(notification);

    try {
      // Twilio API endpoint
      const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;

      // Basic auth credentials
      const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          From: this.fromNumber,
          To: toNumber,
          Body: messageBody
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Twilio error: ${data.code}`);
      }

      console.log(`[WhatsAppChannel] Message sent to ${toNumber}, sid: ${data.sid}`);

      return {
        success: true,
        externalId: data.sid,
        channel: this.channelName
      };

    } catch (error) {
      console.error('[WhatsAppChannel] Send error:', error.message);
      return {
        success: false,
        error: error.message,
        channel: this.channelName
      };
    }
  }

  /**
   * Render message template based on notification type
   */
  renderTemplate(notification) {
    const templates = {
      'waitlist_spot_available': this.renderWaitlistSpotAvailable.bind(this),
      'birthday_today': this.renderBirthdayToday.bind(this),
      'new_lead': this.renderNewLead.bind(this),
      'new_trial': this.renderNewTrial.bind(this),
      'trial_reminder': this.renderTrialReminder.bind(this)
    };

    const renderer = templates[notification.type];
    if (!renderer) {
      return this.renderGeneric(notification);
    }

    return renderer(notification);
  }

  /**
   * Template: Waitlist spot available
   */
  renderWaitlistSpotAvailable(notification) {
    const { data, metadata } = notification;

    return `✅ התפנה מקום!

${data.eventName}
${data.sessionDate} ${data.sessionTime}
${data.coach ? `מדריך/ה: ${data.coach}` : ''}

${data.availableSpots} מקומות פנויים
${metadata?.totalWaitlistSize || '?'} ממתינים ברשימה

רשימת ממתינים:
${notification.recipients.slice(0, 3).map((r, i) => `${i + 1}. ${r.name} ${r.phone || ''}`).join('\n')}${notification.recipients.length > 3 ? `\n...ועוד ${notification.recipients.length - 3}` : ''}`;
  }

  /**
   * Template: Birthday today
   */
  renderBirthdayToday(notification) {
    const { data } = notification;

    const birthdayList = data.birthdays.slice(0, 5)
      .map(b => `• ${b.fullName} (${b.turningAge})`)
      .join('\n');

    return `🎂 יום הולדת היום!
${data.formattedDate}

${data.birthdayCount} חוגגים:
${birthdayList}${data.birthdays.length > 5 ? `\n...ועוד ${data.birthdays.length - 5}` : ''}

שלחו ברכות! 🎉`;
  }

  /**
   * Template: New Lead
   */
  renderNewLead(notification) {
    const { data } = notification;

    if (data.leadCount === 1) {
      const lead = data.leads[0];
      return `🆕 ליד חדש!

שם: ${lead.fullName}
טלפון: ${lead.phone || 'לא צוין'}
מקור: ${lead.source}

צרו קשר בהקדם!`;
    }

    const leadsList = data.leads.slice(0, 5)
      .map(l => `• ${l.fullName} | ${l.phone || '-'} | ${l.source}`)
      .join('\n');

    return `🆕 ${data.leadCount} לידים חדשים!

${leadsList}${data.leads.length > 5 ? `\n...ועוד ${data.leads.length - 5}` : ''}

צרו קשר בהקדם!`;
  }

  /**
   * Template: New Trial
   */
  renderNewTrial(notification) {
    const { data } = notification;

    if (data.trialCount === 1) {
      const trial = data.trials[0];
      const trialDate = new Date(trial.date).toLocaleDateString('he-IL', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      });

      return `🏋️ אימון ניסיון חדש!

${trial.fullName}
${trial.className}
${trialDate} ${trial.time?.substring(0, 5)}
טלפון: ${trial.phone || 'לא צוין'}

שלחו הודעת אישור!`;
    }

    const trialsList = data.trials.slice(0, 5)
      .map(t => {
        const date = new Date(t.date).toLocaleDateString('he-IL', { weekday: 'short', day: 'numeric', month: 'short' });
        return `• ${t.fullName} | ${t.className} | ${date}`;
      })
      .join('\n');

    return `🏋️ ${data.trialCount} אימוני ניסיון חדשים!

${trialsList}${data.trials.length > 5 ? `\n...ועוד ${data.trials.length - 5}` : ''}`;
  }

  /**
   * Template: Trial Reminder
   */
  renderTrialReminder(notification) {
    const { data } = notification;

    const trialsList = data.trials.map(t => {
      const date = new Date(t.date).toLocaleDateString('he-IL', { weekday: 'long', day: 'numeric', month: 'long' });
      return `• ${t.fullName}
  ${t.className}
  ${date} ${t.time?.substring(0, 5)}
  טלפון: ${t.phone || '-'}`;
    }).join('\n\n');

    return `⏰ תזכורת - אימון ניסיון!

${data.trialCount === 1 ? 'אימון' : `${data.trialCount} אימונים`} בעוד פחות מ-${data.reminderWindowHours} שעות:

${trialsList}

שלחו תזכורת למתאמנים!`;
  }

  /**
   * Generic template fallback
   */
  renderGeneric(notification) {
    return `📬 התראה חדשה

סוג: ${notification.type}
${JSON.stringify(notification.data, null, 2).substring(0, 500)}`;
  }
}

module.exports = WhatsAppChannel;
