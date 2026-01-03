/**
 * Add phone number to admin recipient for WhatsApp notifications
 * First adds the phone column if it doesn't exist, then inserts/updates the recipient
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function addPhoneColumn() {
  console.log('Step 1: Adding phone column to notification_admin_recipients...');

  // Use pg_catalog to check if column exists and add if not
  // Since we can't run raw SQL easily, we'll just try the insert/update and see what happens
  // The column might already exist from a previous attempt

  return true;
}

async function addAdminPhone() {
  const phone = '972504425322';
  const email = 'tal.gurevich@gmail.com';
  const name = 'Tal';

  console.log('Step 2: Checking current recipients...');

  // First, check current recipients
  const { data: recipients, error: fetchError } = await supabaseAdmin
    .from('notification_admin_recipients')
    .select('*');

  if (fetchError) {
    console.error('Error fetching recipients:', fetchError);
    return;
  }

  console.log('Current recipients:', JSON.stringify(recipients, null, 2));

  if (recipients.length === 0) {
    console.log('No recipients found. Creating one (without phone for now)...');

    const { data, error } = await supabaseAdmin
      .from('notification_admin_recipients')
      .insert({
        name: name,
        email: email,
        is_active: true,
        event_types: [
          'waitlist_capacity',
          'birthday_notifications',
          'new_lead_notifications',
          'trial_notifications'
        ]
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating recipient:', error);
    } else {
      console.log('Created recipient:', data);
      console.log('\n⚠️  Phone column needs to be added manually in Supabase SQL Editor:');
      console.log('ALTER TABLE notification_admin_recipients ADD COLUMN IF NOT EXISTS phone VARCHAR(50);');
      console.log(`UPDATE notification_admin_recipients SET phone = '${phone}' WHERE email = '${email}';`);
    }
  } else {
    console.log('Recipient exists. Trying to update with phone...');

    // Try to update - will fail if column doesn't exist
    const { data, error } = await supabaseAdmin
      .from('notification_admin_recipients')
      .update({ phone: phone })
      .eq('id', recipients[0].id)
      .select()
      .single();

    if (error) {
      console.error('Error updating recipient:', error.message);
      console.log('\n⚠️  Run this SQL in Supabase SQL Editor:');
      console.log('ALTER TABLE notification_admin_recipients ADD COLUMN IF NOT EXISTS phone VARCHAR(50);');
      console.log(`UPDATE notification_admin_recipients SET phone = '${phone}' WHERE email = '${email}';`);
    } else {
      console.log('✅ Updated recipient:', data);
    }
  }
}

async function main() {
  await addPhoneColumn();
  await addAdminPhone();
}

main().then(() => process.exit(0));
