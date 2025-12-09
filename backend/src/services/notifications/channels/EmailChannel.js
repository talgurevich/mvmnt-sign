/**
 * EmailChannel
 * Sends notifications via email using Resend API
 */

const BaseChannel = require('./BaseChannel');

class EmailChannel extends BaseChannel {
  constructor() {
    super();
    this.channelName = 'email';
    this.apiKey = process.env.RESEND_API_KEY;
    this.fromEmail = process.env.NOTIFICATION_FROM_EMAIL || 'onboarding@resend.dev';
  }

  /**
   * Check if channel is configured
   */
  isConfigured() {
    return !!this.apiKey;
  }

  /**
   * Send an email notification
   */
  async send(recipient, notification) {
    if (!this.isConfigured()) {
      console.warn('[EmailChannel] Not configured - missing RESEND_API_KEY');
      return { success: false, error: 'Email channel not configured' };
    }

    if (!recipient.email) {
      return { success: false, error: 'No email address for recipient' };
    }

    const { subject, html, text } = this.renderTemplate(notification);

    try {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: this.fromEmail,
          to: recipient.email,
          subject,
          html,
          text
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send email');
      }

      console.log(`[EmailChannel] Email sent to ${recipient.email}, id: ${data.id}`);

      return {
        success: true,
        externalId: data.id,
        channel: this.channelName
      };

    } catch (error) {
      console.error('[EmailChannel] Send error:', error.message);
      return {
        success: false,
        error: error.message,
        channel: this.channelName
      };
    }
  }

  /**
   * Render email template based on notification type
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
      // Fallback generic template
      return this.renderGeneric(notification);
    }

    return renderer(notification);
  }

  /**
   * Template: Birthday today
   */
  renderBirthdayToday(notification) {
    const { data } = notification;

    const subject = `🎂 יום הולדת היום! ${data.birthdayCount} חוגגים - ${data.formattedDate}`;

    const birthdayListHtml = data.birthdays.map(b => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">
          <strong>${b.fullName}</strong>
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">
          ${b.turningAge} שנים
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #e5e7eb;">
          ${b.phone || '-'}
        </td>
      </tr>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="he">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; direction: rtl; text-align: right; line-height: 1.6; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #EC4899 0%, #8B5CF6 100%); color: white; padding: 25px; border-radius: 8px 8px 0 0; text-align: center; }
          .header h1 { margin: 0; font-size: 28px; }
          .header .emoji { font-size: 48px; margin-bottom: 10px; }
          .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
          .stats { background: #FDF4FF; padding: 20px; border-radius: 8px; margin: 15px 0; text-align: center; }
          .stats-number { font-size: 48px; font-weight: bold; color: #9333EA; }
          .stats-label { font-size: 14px; color: #6B7280; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th { background: #F3E8FF; padding: 12px; text-align: right; border-bottom: 2px solid #9333EA; }
          .footer { background: #f3f4f6; padding: 15px 20px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none; font-size: 12px; color: #6B7280; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="emoji">🎂</div>
            <h1>יום הולדת שמח!</h1>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">${data.formattedDate}</p>
          </div>
          <div class="content">
            <div class="stats">
              <div class="stats-number">${data.birthdayCount}</div>
              <div class="stats-label">חוגגים היום יום הולדת</div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>שם</th>
                  <th>גיל</th>
                  <th>טלפון</th>
                </tr>
              </thead>
              <tbody>
                ${birthdayListHtml}
              </tbody>
            </table>

            <p style="margin-top: 20px; color: #6B7280;">
              💡 <strong>טיפ:</strong> שלחו הודעת ברכה אישית לחוגגים!
            </p>
          </div>
          <div class="footer">
            <p>הודעה זו נשלחה אוטומטית ממערכת ניהול ימי הולדת.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const birthdayListText = data.birthdays
      .map(b => `• ${b.fullName} (${b.turningAge} שנים) - ${b.phone || 'אין טלפון'}`)
      .join('\n');

    const text = `
🎂 יום הולדת היום!
${data.formattedDate}

${data.birthdayCount} חוגגים היום:

${birthdayListText}

💡 שלחו הודעת ברכה אישית לחוגגים!
    `.trim();

    return { subject, html, text };
  }

  /**
   * Template: Waitlist spot available
   */
  renderWaitlistSpotAvailable(notification) {
    const { data, recipient, metadata } = notification;

    const subject = `התפנה מקום! ${data.eventName} - ${data.sessionDate} ${data.sessionTime}`;

    const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="he">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; direction: rtl; text-align: right; line-height: 1.6; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4F46E5; color: white; padding: 20px; border-radius: 8px 8px 0 0; text-align: center; }
          .header h1 { margin: 0; font-size: 24px; }
          .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
          .highlight { background: #FEF3C7; padding: 15px; border-radius: 8px; margin: 15px 0; border-right: 4px solid #F59E0B; }
          .highlight ul { margin: 10px 0; padding-right: 20px; }
          .highlight li { margin: 5px 0; }
          .stats { display: flex; justify-content: space-around; margin: 20px 0; }
          .stat { text-align: center; padding: 10px; }
          .stat-number { font-size: 32px; font-weight: bold; color: #4F46E5; }
          .stat-label { font-size: 12px; color: #6B7280; }
          .footer { background: #f3f4f6; padding: 15px 20px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none; font-size: 12px; color: #6B7280; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>התפנה מקום בשיעור!</h1>
          </div>
          <div class="content">
            <p>שלום,</p>

            <div class="highlight">
              <strong>פרטי השיעור:</strong>
              <ul>
                <li><strong>שיעור:</strong> ${data.eventName}</li>
                <li><strong>תאריך:</strong> ${data.sessionDate}</li>
                <li><strong>שעה:</strong> ${data.sessionTime}</li>
                ${data.coach ? `<li><strong>מדריך/ה:</strong> ${data.coach}</li>` : ''}
              </ul>
            </div>

            <div class="stats">
              <div class="stat">
                <div class="stat-number">${data.availableSpots}</div>
                <div class="stat-label">מקומות פנויים</div>
              </div>
              <div class="stat">
                <div class="stat-number">${metadata?.totalWaitlistSize || '?'}</div>
                <div class="stat-label">ממתינים ברשימה</div>
              </div>
            </div>

            <p><strong>רשימת הממתינים:</strong></p>
            <ol>
              ${notification.recipients.slice(0, 5).map(r =>
                `<li>${r.name} ${r.phone ? `(${r.phone})` : ''}</li>`
              ).join('')}
              ${notification.recipients.length > 5 ? `<li>...ועוד ${notification.recipients.length - 5}</li>` : ''}
            </ol>

            <p style="margin-top: 20px;">
              ניתן ליצור קשר עם הראשונים ברשימה ולהציע להם להירשם.
            </p>
          </div>
          <div class="footer">
            <p>הודעה זו נשלחה אוטומטית ממערכת ניהול רשימת ההמתנה.</p>
            <p>זמן זיהוי: ${new Date(metadata?.detectedAt).toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' })}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const waitlistText = notification.recipients.slice(0, 5)
      .map((r, i) => `${i + 1}. ${r.name} ${r.phone ? `(${r.phone})` : ''}`)
      .join('\n');

    const text = `
התפנה מקום בשיעור!

פרטי השיעור:
- שיעור: ${data.eventName}
- תאריך: ${data.sessionDate}
- שעה: ${data.sessionTime}
${data.coach ? `- מדריך/ה: ${data.coach}` : ''}

מקומות פנויים: ${data.availableSpots}
ממתינים ברשימה: ${metadata?.totalWaitlistSize || '?'}

רשימת הממתינים:
${waitlistText}

ניתן ליצור קשר עם הראשונים ברשימה ולהציע להם להירשם.
    `.trim();

    return { subject, html, text };
  }

  /**
   * Template: New Lead
   */
  renderNewLead(notification) {
    const { data } = notification;

    const subject = data.leadCount === 1
      ? `🆕 ליד חדש! ${data.leads[0].fullName}`
      : `🆕 ${data.leadCount} לידים חדשים!`;

    const leadsListHtml = data.leads.map(lead => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
          <strong>${lead.fullName}</strong>
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
          ${lead.phone || '-'}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
          ${lead.email || '-'}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
          ${lead.source}
        </td>
      </tr>
    `).join('');

    const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="he">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; direction: rtl; text-align: right; line-height: 1.6; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #10B981 0%, #059669 100%); color: white; padding: 25px; border-radius: 8px 8px 0 0; text-align: center; }
          .header h1 { margin: 0; font-size: 28px; }
          .header .emoji { font-size: 48px; margin-bottom: 10px; }
          .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
          .stats { background: #ECFDF5; padding: 20px; border-radius: 8px; margin: 15px 0; text-align: center; }
          .stats-number { font-size: 48px; font-weight: bold; color: #059669; }
          .stats-label { font-size: 14px; color: #6B7280; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th { background: #D1FAE5; padding: 12px; text-align: right; border-bottom: 2px solid #10B981; }
          .footer { background: #f3f4f6; padding: 15px 20px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none; font-size: 12px; color: #6B7280; }
          .action-btn { display: inline-block; background: #10B981; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; margin-top: 15px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="emoji">🆕</div>
            <h1>${data.leadCount === 1 ? 'ליד חדש!' : 'לידים חדשים!'}</h1>
          </div>
          <div class="content">
            <div class="stats">
              <div class="stats-number">${data.leadCount}</div>
              <div class="stats-label">${data.leadCount === 1 ? 'ליד חדש נוסף למערכת' : 'לידים חדשים נוספו למערכת'}</div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>שם</th>
                  <th>טלפון</th>
                  <th>אימייל</th>
                  <th>מקור</th>
                </tr>
              </thead>
              <tbody>
                ${leadsListHtml}
              </tbody>
            </table>

            <p style="margin-top: 20px; color: #6B7280;">
              💡 <strong>טיפ:</strong> צרו קשר עם הלידים החדשים בהקדם האפשרי!
            </p>
          </div>
          <div class="footer">
            <p>הודעה זו נשלחה אוטומטית ממערכת ניהול הלידים.</p>
            <p>זמן זיהוי: ${new Date(data.detectedAt).toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' })}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const leadsListText = data.leads
      .map(lead => `• ${lead.fullName} | ${lead.phone || 'אין טלפון'} | ${lead.source}`)
      .join('\n');

    const text = `
🆕 ${data.leadCount === 1 ? 'ליד חדש!' : `${data.leadCount} לידים חדשים!`}

${leadsListText}

💡 צרו קשר עם הלידים החדשים בהקדם האפשרי!
    `.trim();

    return { subject, html, text };
  }

  /**
   * Template: New Trial Registration
   */
  renderNewTrial(notification) {
    const { data } = notification;

    const subject = data.trialCount === 1
      ? `🏋️ אימון ניסיון חדש! ${data.trials[0].fullName} - ${data.trials[0].className}`
      : `🏋️ ${data.trialCount} אימוני ניסיון חדשים!`;

    const trialsListHtml = data.trials.map(trial => {
      const trialDate = new Date(trial.date).toLocaleDateString('he-IL', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      });
      const trialTime = trial.time?.substring(0, 5) || '';

      return `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
          <strong>${trial.fullName}</strong>
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
          ${trial.className}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
          ${trialDate}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
          ${trialTime}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
          ${trial.phone || '-'}
        </td>
      </tr>
    `;
    }).join('');

    const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="he">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; direction: rtl; text-align: right; line-height: 1.6; }
          .container { max-width: 650px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #6366F1 0%, #8B5CF6 100%); color: white; padding: 25px; border-radius: 8px 8px 0 0; text-align: center; }
          .header h1 { margin: 0; font-size: 28px; }
          .header .emoji { font-size: 48px; margin-bottom: 10px; }
          .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
          .stats { background: #EEF2FF; padding: 20px; border-radius: 8px; margin: 15px 0; text-align: center; }
          .stats-number { font-size: 48px; font-weight: bold; color: #6366F1; }
          .stats-label { font-size: 14px; color: #6B7280; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th { background: #E0E7FF; padding: 12px; text-align: right; border-bottom: 2px solid #6366F1; }
          .footer { background: #f3f4f6; padding: 15px 20px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none; font-size: 12px; color: #6B7280; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="emoji">🏋️</div>
            <h1>${data.trialCount === 1 ? 'אימון ניסיון חדש!' : 'אימוני ניסיון חדשים!'}</h1>
          </div>
          <div class="content">
            <div class="stats">
              <div class="stats-number">${data.trialCount}</div>
              <div class="stats-label">${data.trialCount === 1 ? 'נרשם לאימון ניסיון' : 'נרשמו לאימוני ניסיון'}</div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>שם</th>
                  <th>שיעור</th>
                  <th>תאריך</th>
                  <th>שעה</th>
                  <th>טלפון</th>
                </tr>
              </thead>
              <tbody>
                ${trialsListHtml}
              </tbody>
            </table>

            <p style="margin-top: 20px; color: #6B7280;">
              💡 <strong>טיפ:</strong> שלחו הודעת אישור למתאמנים החדשים!
            </p>
          </div>
          <div class="footer">
            <p>הודעה זו נשלחה אוטומטית ממערכת ניהול אימוני הניסיון.</p>
            <p>זמן זיהוי: ${new Date(data.detectedAt).toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' })}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const trialsListText = data.trials.map(trial => {
      const trialDate = new Date(trial.date).toLocaleDateString('he-IL', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      });
      return `• ${trial.fullName} | ${trial.className} | ${trialDate} ${trial.time?.substring(0, 5)} | ${trial.phone || 'אין טלפון'}`;
    }).join('\n');

    const text = `
🏋️ ${data.trialCount === 1 ? 'אימון ניסיון חדש!' : `${data.trialCount} אימוני ניסיון חדשים!`}

${trialsListText}

💡 שלחו הודעת אישור למתאמנים החדשים!
    `.trim();

    return { subject, html, text };
  }

  /**
   * Template: Trial Reminder (10 hours before)
   */
  renderTrialReminder(notification) {
    const { data } = notification;

    const subject = data.trialCount === 1
      ? `⏰ תזכורת: אימון ניסיון בקרוב! ${data.trials[0].fullName}`
      : `⏰ תזכורת: ${data.trialCount} אימוני ניסיון בקרוב!`;

    const trialsListHtml = data.trials.map(trial => {
      const trialDate = new Date(trial.date).toLocaleDateString('he-IL', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      });
      const trialTime = trial.time?.substring(0, 5) || '';

      return `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
          <strong>${trial.fullName}</strong>
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
          ${trial.className}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
          ${trialDate}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
          ${trialTime}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
          ${trial.phone || '-'}
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #e5e7eb;">
          ${trial.coach || '-'}
        </td>
      </tr>
    `;
    }).join('');

    const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="he">
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; direction: rtl; text-align: right; line-height: 1.6; }
          .container { max-width: 700px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #F59E0B 0%, #D97706 100%); color: white; padding: 25px; border-radius: 8px 8px 0 0; text-align: center; }
          .header h1 { margin: 0; font-size: 28px; }
          .header .emoji { font-size: 48px; margin-bottom: 10px; }
          .content { background: #f9fafb; padding: 20px; border: 1px solid #e5e7eb; }
          .alert { background: #FEF3C7; padding: 15px; border-radius: 8px; margin: 15px 0; border-right: 4px solid #F59E0B; }
          .stats { background: #FFFBEB; padding: 20px; border-radius: 8px; margin: 15px 0; text-align: center; }
          .stats-number { font-size: 48px; font-weight: bold; color: #D97706; }
          .stats-label { font-size: 14px; color: #6B7280; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; }
          th { background: #FDE68A; padding: 12px; text-align: right; border-bottom: 2px solid #F59E0B; }
          .footer { background: #f3f4f6; padding: 15px 20px; border-radius: 0 0 8px 8px; border: 1px solid #e5e7eb; border-top: none; font-size: 12px; color: #6B7280; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="emoji">⏰</div>
            <h1>תזכורת - אימוני ניסיון בקרוב!</h1>
          </div>
          <div class="content">
            <div class="alert">
              <strong>שימו לב:</strong> האימונים הבאים מתחילים בעוד פחות מ-${data.reminderWindowHours} שעות!
            </div>

            <div class="stats">
              <div class="stats-number">${data.trialCount}</div>
              <div class="stats-label">${data.trialCount === 1 ? 'אימון ניסיון' : 'אימוני ניסיון'} בקרוב</div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>שם</th>
                  <th>שיעור</th>
                  <th>תאריך</th>
                  <th>שעה</th>
                  <th>טלפון</th>
                  <th>מדריך/ה</th>
                </tr>
              </thead>
              <tbody>
                ${trialsListHtml}
              </tbody>
            </table>

            <p style="margin-top: 20px; color: #6B7280;">
              💡 <strong>טיפ:</strong> כדאי לשלוח הודעת תזכורת למתאמנים ולוודא שהם מגיעים!
            </p>
          </div>
          <div class="footer">
            <p>הודעה זו נשלחה אוטומטית ממערכת ניהול אימוני הניסיון.</p>
            <p>זמן זיהוי: ${new Date(data.detectedAt).toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' })}</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const trialsListText = data.trials.map(trial => {
      const trialDate = new Date(trial.date).toLocaleDateString('he-IL', {
        weekday: 'long',
        day: 'numeric',
        month: 'long'
      });
      return `• ${trial.fullName} | ${trial.className} | ${trialDate} ${trial.time?.substring(0, 5)} | ${trial.phone || 'אין טלפון'} | מדריך: ${trial.coach || '-'}`;
    }).join('\n');

    const text = `
⏰ תזכורת - אימוני ניסיון בקרוב!

שימו לב: האימונים הבאים מתחילים בעוד פחות מ-${data.reminderWindowHours} שעות!

${trialsListText}

💡 כדאי לשלוח הודעת תזכורת למתאמנים ולוודא שהם מגיעים!
    `.trim();

    return { subject, html, text };
  }

  /**
   * Generic template fallback
   */
  renderGeneric(notification) {
    const subject = `Notification: ${notification.type}`;
    const html = `<pre>${JSON.stringify(notification.data, null, 2)}</pre>`;
    const text = JSON.stringify(notification.data, null, 2);
    return { subject, html, text };
  }
}

module.exports = EmailChannel;
