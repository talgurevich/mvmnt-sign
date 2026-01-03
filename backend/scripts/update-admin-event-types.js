/**
 * Update admin recipient to include membership_expiry_notifications
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function updateEventTypes() {
  const email = 'tal.gurevich@gmail.com';

  console.log('Updating admin recipient event types...');

  const { data, error } = await supabaseAdmin
    .from('notification_admin_recipients')
    .update({
      event_types: [
        'waitlist_capacity',
        'birthday_notifications',
        'new_lead_notifications',
        'trial_notifications',
        'membership_expiry_notifications'
      ]
    })
    .eq('email', email)
    .select()
    .single();

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('✅ Updated:', data);
  }
}

updateEventTypes().then(() => process.exit(0));
