// Script to add document_signed_notifications to admin recipients

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

async function main() {
  // First get current recipients
  const { data: recipients, error: fetchError } = await supabase
    .from('notification_admin_recipients')
    .select('*')
    .eq('is_active', true);

  if (fetchError) {
    console.error('Error fetching recipients:', fetchError);
    process.exit(1);
  }

  console.log('Current recipients:', JSON.stringify(recipients, null, 2));

  // Add document_signed_notifications to each recipient
  for (const recipient of recipients) {
    const eventTypes = recipient.event_types || [];
    if (!eventTypes.includes('document_signed_notifications')) {
      eventTypes.push('document_signed_notifications');

      const { error: updateError } = await supabase
        .from('notification_admin_recipients')
        .update({ event_types: eventTypes })
        .eq('id', recipient.id);

      if (updateError) {
        console.error('Error updating recipient:', updateError);
      } else {
        console.log('Updated recipient:', recipient.name);
      }
    } else {
      console.log('Recipient already has event type:', recipient.name);
    }
  }

  console.log('Done!');
}

main().catch(console.error);
