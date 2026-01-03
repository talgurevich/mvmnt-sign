/**
 * Direct Twilio API test
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

async function testTwilio() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_WHATSAPP_FROM;
  const toNumber = 'whatsapp:+972504425322';

  console.log('Testing Twilio WhatsApp API...');
  console.log('Account SID:', accountSid);
  console.log('From:', fromNumber);
  console.log('To:', toNumber);
  console.log('');

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

  console.log('Sending test message...');

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        From: fromNumber,
        To: toNumber,
        Body: '🧪 Test from MVMNT Sign - WhatsApp notifications are working!'
      })
    });

    const data = await response.json();
    console.log('Response status:', response.status);
    console.log('Response:', JSON.stringify(data, null, 2));

    if (data.sid) {
      console.log('\n✅ Message sent successfully! Check your WhatsApp.');
    }
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testTwilio();
