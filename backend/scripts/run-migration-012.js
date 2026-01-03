/**
 * Run migration 012 - Add membership expiry automation
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function runMigration() {
  console.log('Running migration 012...');

  const { data, error } = await supabaseAdmin
    .from('automation_settings')
    .upsert({
      id: 'membership_expiry_notifications',
      name: 'התראות סיום מנוי',
      description: 'שליחת התראה כאשר מנוי של לקוח עומד לפוג בשבוע הקרוב',
      is_enabled: true,
      config: { expiry_window_days: 7, notify_admin: true }
    }, { onConflict: 'id' })
    .select()
    .single();

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('✅ Created automation setting:', data);
  }
}

runMigration().then(() => process.exit(0));
