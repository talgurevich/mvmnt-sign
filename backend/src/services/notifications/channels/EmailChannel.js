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
      'waitlist_spot_available': this.renderWaitlistSpotAvailable.bind(this)
    };

    const renderer = templates[notification.type];
    if (!renderer) {
      // Fallback generic template
      return this.renderGeneric(notification);
    }

    return renderer(notification);
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
