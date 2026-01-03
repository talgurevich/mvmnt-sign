/**
 * Run migration 013 - Add new membership automation
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function runMigration() {
  console.log('Running migration 013...');

  // Add new membership notification automation setting
  const { data, error } = await supabaseAdmin
    .from('automation_settings')
    .upsert({
      id: 'new_membership_notifications',
      name: 'התראות מנוי חדש',
      description: 'שליחת התראה כאשר לקוח חדש רוכש מנוי',
      is_enabled: true,
      config: { lookback_days: 7, notify_admin: true }
    }, { onConflict: 'id' })
    .select()
    .single();

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Created automation setting:', data);
  }

  // Add new_membership_notifications to admin recipients event_types
  const { data: recipients, error: recipientsError } = await supabaseAdmin
    .from('notification_admin_recipients')
    .select('id, event_types')
    .eq('is_active', true);

  if (recipientsError) {
    console.error('Error fetching recipients:', recipientsError);
  } else {
    for (const recipient of recipients) {
      const eventTypes = recipient.event_types || [];
      if (!eventTypes.includes('new_membership_notifications')) {
        eventTypes.push('new_membership_notifications');
        await supabaseAdmin
          .from('notification_admin_recipients')
          .update({ event_types: eventTypes })
          .eq('id', recipient.id);
        console.log(`Updated recipient ${recipient.id} with new_membership_notifications`);
      }
    }
  }
}

runMigration().then(() => process.exit(0));
