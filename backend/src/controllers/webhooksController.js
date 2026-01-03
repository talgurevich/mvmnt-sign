/**
 * Webhooks Controller
 * Handles incoming webhooks from external services
 */

const { catchAsync } = require('../middleware/errorHandler');

// Slack webhook URL from environment
const SLACK_WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

/**
 * Handle incoming WhatsApp messages from Twilio
 * Twilio sends POST requests with form-encoded data
 */
exports.handleWhatsAppIncoming = catchAsync(async (req, res) => {
  const {
    From,           // Sender's phone number (whatsapp:+972...)
    Body,           // Message text
    ProfileName,    // Sender's WhatsApp profile name
    MessageSid,     // Twilio message ID
    NumMedia,       // Number of media attachments
    MediaUrl0,      // First media URL if any
    MediaContentType0 // Media type
  } = req.body;

  console.log('[Webhook] Incoming WhatsApp message:', {
    from: From,
    profileName: ProfileName,
    body: Body?.substring(0, 100),
    messageSid: MessageSid
  });

  // Clean up phone number for display
  const cleanPhone = From?.replace('whatsapp:', '') || 'Unknown';
  const senderName = ProfileName || cleanPhone;

  // Build Slack message
  const hasMedia = parseInt(NumMedia) > 0;
  let mediaInfo = '';
  if (hasMedia) {
    mediaInfo = `\n📎 מצורף: ${MediaContentType0 || 'קובץ'}`;
  }

  const slackMessage = {
    text: `📱 תשובה בוואטסאפ מ-${senderName}`,
    blocks: [
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '📱 תשובה בוואטסאפ',
          emoji: true
        }
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: `*מאת:*\n${senderName}`
          },
          {
            type: 'mrkdwn',
            text: `*טלפון:*\n${cleanPhone}`
          }
        ]
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*הודעה:*\n${Body || '(ללא טקסט)'}${mediaInfo}`
        }
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: `${new Date().toLocaleString('he-IL', { timeZone: 'Asia/Jerusalem' })}`
          }
        ]
      }
    ]
  };

  // Send to Slack
  if (SLACK_WEBHOOK_URL) {
    try {
      const slackResponse = await fetch(SLACK_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(slackMessage)
      });

      if (!slackResponse.ok) {
        console.error('[Webhook] Slack error:', await slackResponse.text());
      } else {
        console.log('[Webhook] Forwarded to Slack successfully');
      }
    } catch (error) {
      console.error('[Webhook] Error forwarding to Slack:', error.message);
    }
  } else {
    console.warn('[Webhook] SLACK_WEBHOOK_URL not configured');
  }

  // Twilio expects a TwiML response
  // Send auto-reply directing users to the correct number
  res.type('text/xml');
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>שלום! 👋
זהו מספר להודעות אוטומטיות בלבד ואינו מיועד לתמיכה.
לכל שאלה או פנייה, אנא צרו קשר ב: 052-288-0040
תודה! 🙏</Message>
</Response>`);
});

/**
 * Twilio status callback for message delivery status updates
 */
exports.handleWhatsAppStatus = catchAsync(async (req, res) => {
  const {
    MessageSid,
    MessageStatus,  // queued, sent, delivered, read, failed, undelivered
    To,
    ErrorCode,
    ErrorMessage
  } = req.body;

  console.log('[Webhook] WhatsApp status update:', {
    messageSid: MessageSid,
    status: MessageStatus,
    to: To,
    errorCode: ErrorCode,
    errorMessage: ErrorMessage
  });

  // Only notify on failures
  if (MessageStatus === 'failed' || MessageStatus === 'undelivered') {
    if (SLACK_WEBHOOK_URL) {
      const errorSlackMessage = {
        text: `❌ שליחת הודעת WhatsApp נכשלה`,
        blocks: [
          {
            type: 'section',
            text: {
              type: 'mrkdwn',
              text: `❌ *שליחת הודעה נכשלה*\nאל: ${To?.replace('whatsapp:', '')}\nסטטוס: ${MessageStatus}\n${ErrorMessage ? `שגיאה: ${ErrorMessage}` : ''}`
            }
          }
        ]
      };

      try {
        await fetch(SLACK_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(errorSlackMessage)
        });
      } catch (error) {
        console.error('[Webhook] Error sending failure notification:', error.message);
      }
    }
  }

  // Acknowledge receipt
  res.sendStatus(200);
});

module.exports = exports;
