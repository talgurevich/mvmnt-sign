/**
 * GreenApiChannel
 * Sends notifications via WhatsApp using Green-API.com
 * Much simpler than Twilio - just link your WhatsApp via QR code
 */

const BaseChannel = require('./BaseChannel');

class GreenApiChannel extends BaseChannel {
  constructor() {
    super();
    this.channelName = 'whatsapp';
    this.instanceId = process.env.GREEN_API_INSTANCE_ID;
    this.apiToken = process.env.GREEN_API_TOKEN;
    this.apiUrl = process.env.GREEN_API_URL || 'https://api.green-api.com';
  }

  /**
   * Check if channel is configured
   */
  isConfigured() {
    return !!(this.instanceId && this.apiToken);
  }

  /**
   * Format phone number for Green API
   * Format: 972XXXXXXXXX@c.us
   */
  formatPhoneNumber(phone) {
    if (!phone) return null;

    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');

    // Handle Israeli numbers starting with 0
    if (cleaned.startsWith('0')) {
      cleaned = '972' + cleaned.substring(1);
    }

    // Add @c.us suffix for personal chats
    return cleaned + '@c.us';
  }

  /**
   * Send a WhatsApp message via Green API
   */
  async send(recipient, notification) {
    if (!this.isConfigured()) {
      console.warn('[GreenApiChannel] Not configured - missing GREEN_API credentials');
      return { success: false, error: 'Green API channel not configured' };
    }

    const chatId = this.formatPhoneNumber(recipient.phone);
    if (!chatId) {
      return { success: false, error: 'No phone number for recipient' };
    }

    try {
      const message = this.renderMessage(notification);
      const url = `${this.apiUrl}/waInstance${this.instanceId}/sendMessage/${this.apiToken}`;

      console.log(`[GreenApiChannel] Sending to ${chatId}`);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          chatId,
          message
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Green API error: ${response.status}`);
      }

      console.log(`[GreenApiChannel] Message sent, id: ${data.idMessage}`);

      return {
        success: true,
        externalId: data.idMessage,
        channel: this.channelName
      };

    } catch (error) {
      console.error('[GreenApiChannel] Send error:', error.message);
      return {
        success: false,
        error: error.message,
        channel: this.channelName
      };
    }
  }

  /**
   * Render message based on notification type
   */
  renderMessage(notification) {
    const renderers = {
      'waitlist_spot_available': this.renderWaitlistSpotAvailable,
      'birthday_today': this.renderBirthdayToday,
      'new_lead': this.renderNewLead,
      'new_trial': this.renderNewTrial,
      'trial_reminder': this.renderTrialReminder,
      'membership_expiring': this.renderMembershipExpiring,
      'new_membership': this.renderNewMembership,
      'document_signed': this.renderDocumentSigned,
      'new_order': this.renderNewOrder
    };

    const renderer = renderers[notification.type];
    if (!renderer) {
      return this.renderGeneric(notification);
    }

    return renderer.call(this, notification);
  }

  renderWaitlistSpotAvailable(notification) {
    const { data, metadata, recipients } = notification;
    return `✅ התפנה מקום!

${data.eventName}
${data.sessionDate} ${data.sessionTime}
${data.coach ? `מדריך/ה: ${data.coach}` : ''}

${data.availableSpots} מקומות פנויים

רשימת ממתינים:
${recipients.slice(0, 3).map((r, i) => `${i + 1}. ${r.name} ${r.phone || ''}`).join('\n')}${recipients.length > 3 ? `\n...ועוד ${recipients.length - 3}` : ''}`;
  }

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

  renderMembershipExpiring(notification) {
    const { data } = notification;

    if (data.expiringCount === 1) {
      const member = data.members[0];
      const urgency = member.daysUntilExpiry === 0 ? 'היום!' :
                     member.daysUntilExpiry === 1 ? 'מחר!' :
                     `בעוד ${member.daysUntilExpiry} ימים`;

      return `⚠️ מנוי עומד לפוג ${urgency}

${member.fullName}
${member.membershipType}
תאריך סיום: ${member.formattedEndDate}
טלפון: ${member.phone || 'לא צוין'}

צרו קשר לחידוש המנוי!`;
    }

    const membersList = data.members.slice(0, 5).map(m => {
      const days = m.daysUntilExpiry === 0 ? 'היום' :
                   m.daysUntilExpiry === 1 ? 'מחר' :
                   `${m.daysUntilExpiry} ימים`;
      return `• ${m.fullName} | ${m.membershipType} | ${days}`;
    }).join('\n');

    return `⚠️ ${data.expiringCount} מנויים עומדים לפוג!

${membersList}${data.members.length > 5 ? `\n...ועוד ${data.members.length - 5}` : ''}

צרו קשר לחידוש!`;
  }

  renderNewMembership(notification) {
    const { data } = notification;

    if (data.memberCount === 1) {
      const member = data.members[0];

      return `🎉 מנוי חדש!

${member.fullName}
${member.membershipType}
תאריך התחלה: ${member.formattedStartDate}
טלפון: ${member.phone || 'לא צוין'}

ברוכים הבאים למשפחה!`;
    }

    const membersList = data.members.slice(0, 5).map(m => {
      return `• ${m.fullName} | ${m.membershipType}`;
    }).join('\n');

    return `🎉 ${data.memberCount} מנויים חדשים!

${membersList}${data.members.length > 5 ? `\n...ועוד ${data.members.length - 5}` : ''}

ברוכים הבאים!`;
  }

  renderDocumentSigned(notification) {
    const { data } = notification;

    return `✍️ מסמך נחתם!

${data.customerName} חתם/ה על המסמך:
${data.templateName}

חותם: ${data.signerName}
תאריך: ${data.signedAt}`;
  }

  renderNewOrder(notification) {
    const { data } = notification;

    const itemsList = data.items.map(item =>
      `• ${item.name} - ${item.color} - ${item.size} x${item.quantity} (${item.total}₪)`
    ).join('\n');

    return `🛍️ הזמנה חדשה!

לקוח: ${data.customerName}

פריטים:
${itemsList}

סה"כ: ${data.totalAmount}₪`;
  }

  renderGeneric(notification) {
    return `📬 התראה חדשה

סוג: ${notification.type}
${JSON.stringify(notification.data, null, 2).substring(0, 500)}`;
  }
}

module.exports = GreenApiChannel;
