/**
 * WhatsAppChannel
 * Sends notifications via WhatsApp using Twilio Content API
 */

const BaseChannel = require('./BaseChannel');

// Content Template SIDs from Twilio
const CONTENT_TEMPLATES = {
  'waitlist_spot_available': 'HX5dda65bb0e63f0ef5294983c892c6420',
  'birthday_today': 'HX88e24cda2621a666242710b2d32cf1b8',
  'new_lead': 'HX20759ede0328018030c6da73b95bc98b',
  'new_trial': 'HXf66348ac60035f1a9de116cf14086168',
  'trial_reminder': 'HXf66348ac60035f1a9de116cf14086168', // Use trial template
  'membership_expiring': 'HXd22caafded593452a8eb3866e9733d59',
  'new_membership': 'HX5e43998510f668889d7ab6fc70f5f8ca',
  'document_signed': 'HX74df01cc4b891a739ce801a5e83d2d5c',
  'new_order': null // Will use freeform until template is approved
};

class WhatsAppChannel extends BaseChannel {
  constructor() {
    super();
    this.channelName = 'whatsapp';
    this.accountSid = process.env.TWILIO_ACCOUNT_SID;
    this.authToken = process.env.TWILIO_AUTH_TOKEN;
    this.fromNumber = process.env.TWILIO_WHATSAPP_FROM;
    // Use Content API templates (for WhatsApp Business)
    this.useContentApi = process.env.USE_WHATSAPP_TEMPLATES === 'true';
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

    try {
      const url = `https://api.twilio.com/2010-04-01/Accounts/${this.accountSid}/Messages.json`;
      const auth = Buffer.from(`${this.accountSid}:${this.authToken}`).toString('base64');

      let requestBody;

      if (this.useContentApi && CONTENT_TEMPLATES[notification.type]) {
        // Use Content API with templates
        const templateData = this.getTemplateVariables(notification);
        requestBody = new URLSearchParams({
          From: this.fromNumber,
          To: toNumber,
          ContentSid: templateData.contentSid,
          ContentVariables: JSON.stringify(templateData.variables)
        });
        console.log(`[WhatsAppChannel] Using Content API template: ${templateData.contentSid}`);
      } else {
        // Fallback to free-form text (sandbox mode)
        const messageBody = this.renderFreeformMessage(notification);
        requestBody = new URLSearchParams({
          From: this.fromNumber,
          To: toNumber,
          Body: messageBody
        });
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: requestBody
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
   * Get Content API template variables based on notification type
   */
  getTemplateVariables(notification) {
    const { type, data, metadata, recipients } = notification;
    const contentSid = CONTENT_TEMPLATES[type];

    switch (type) {
      case 'document_signed':
        return {
          contentSid,
          variables: {
            "1": data.customerName || 'לקוח',
            "2": data.templateName || 'מסמך',
            "3": data.signerName || 'לא צוין',
            "4": data.signedAt || new Date().toLocaleString('he-IL')
          }
        };

      case 'birthday_today':
        const birthdayList = data.birthdays.slice(0, 5)
          .map(b => `• ${b.fullName} (${b.turningAge})`)
          .join('\n');
        return {
          contentSid,
          variables: {
            "1": data.formattedDate || '',
            "2": String(data.birthdayCount || 0),
            "3": birthdayList
          }
        };

      case 'new_lead':
        const lead = data.leads?.[0] || {};
        return {
          contentSid,
          variables: {
            "1": lead.fullName || 'לא צוין',
            "2": lead.phone || 'לא צוין',
            "3": lead.source || 'לא צוין'
          }
        };

      case 'new_trial':
      case 'trial_reminder':
        const trial = data.trials?.[0] || {};
        const trialDate = trial.date ? new Date(trial.date).toLocaleDateString('he-IL', {
          weekday: 'long',
          day: 'numeric',
          month: 'long'
        }) : '';
        return {
          contentSid,
          variables: {
            "1": trial.fullName || 'לא צוין',
            "2": trial.className || 'לא צוין',
            "3": trialDate,
            "4": trial.time?.substring(0, 5) || '',
            "5": trial.phone || 'לא צוין'
          }
        };

      case 'membership_expiring':
        const member = data.members?.[0] || {};
        const urgency = member.daysUntilExpiry === 0 ? 'היום!' :
                       member.daysUntilExpiry === 1 ? 'מחר!' :
                       `בעוד ${member.daysUntilExpiry} ימים`;
        return {
          contentSid,
          variables: {
            "1": urgency,
            "2": member.fullName || 'לא צוין',
            "3": member.membershipType || 'לא צוין',
            "4": member.formattedEndDate || '',
            "5": member.phone || 'לא צוין'
          }
        };

      case 'new_membership':
        const newMember = data.members?.[0] || {};
        return {
          contentSid,
          variables: {
            "1": newMember.fullName || 'לא צוין',
            "2": newMember.membershipType || 'לא צוין',
            "3": newMember.formattedStartDate || '',
            "4": newMember.phone || 'לא צוין'
          }
        };

      case 'waitlist_spot_available':
        const waitlist = recipients?.slice(0, 3)
          .map((r, i) => `${i + 1}. ${r.name}`)
          .join('\n') || '';
        return {
          contentSid,
          variables: {
            "1": data.eventName || 'שיעור',
            "2": data.sessionDate || '',
            "3": data.sessionTime || '',
            "4": String(data.availableSpots || 0),
            "5": waitlist
          }
        };

      default:
        return { contentSid, variables: {} };
    }
  }

  /**
   * Render free-form message (for sandbox mode)
   */
  renderFreeformMessage(notification) {
    const renderers = {
      'waitlist_spot_available': this.renderWaitlistSpotAvailable.bind(this),
      'birthday_today': this.renderBirthdayToday.bind(this),
      'new_lead': this.renderNewLead.bind(this),
      'new_trial': this.renderNewTrial.bind(this),
      'trial_reminder': this.renderTrialReminder.bind(this),
      'membership_expiring': this.renderMembershipExpiring.bind(this),
      'new_membership': this.renderNewMembership.bind(this),
      'document_signed': this.renderDocumentSigned.bind(this),
      'new_order': this.renderNewOrder.bind(this)
    };

    const renderer = renderers[notification.type];
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
   * Template: Membership Expiring
   */
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

  /**
   * Template: New Membership
   */
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

  /**
   * Template: Document Signed
   */
  renderDocumentSigned(notification) {
    const { data } = notification;

    return `✍️ מסמך נחתם!

${data.customerName} חתם/ה על המסמך:
${data.templateName}

חותם: ${data.signerName}
תאריך: ${data.signedAt}
${data.signedDocumentUrl ? `\nקישור למסמך החתום: ${data.signedDocumentUrl}` : ''}`;
  }

  /**
   * Template: New Order
   */
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
