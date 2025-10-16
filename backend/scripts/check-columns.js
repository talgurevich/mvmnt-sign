// Check exact columns in form_templates table
require('dotenv').config()
const { supabaseAdmin } = require('../src/config/supabase')

async function checkColumns() {
  console.log('🔍 Querying information_schema for form_templates columns...\n')

  // Query PostgreSQL information_schema to get exact column details
  const { data, error } = await supabaseAdmin
    .rpc('exec_sql', {
      query: `
        SELECT column_name, data_type, is_nullable, column_default
        FROM information_schema.columns
        WHERE table_name = 'form_templates'
        ORDER BY ordinal_position;
      `
    })

  if (error) {
    console.error('RPC not available, trying direct query...\n')

    // Alternative: Try to get schema from a failed insert
    const { error: insertError } = await supabaseAdmin
      .from('form_templates')
      .insert({})
      .select()

    if (insertError) {
      console.log('Insert error details:', insertError.message)
      console.log('\nThis reveals required columns.')
    }
    return
  }

  console.log('✅ Current columns in form_templates:')
  console.table(data)
}

checkColumns()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
