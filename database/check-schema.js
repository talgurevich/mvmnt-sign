// Check current database schema
require('dotenv').config({ path: require('path').join(__dirname, '..', 'backend', '.env') })
const { supabaseAdmin } = require('../backend/src/config/supabase')

async function checkSchema() {
  console.log('🔍 Checking form_templates table schema...\n')

  try {
    // Try to fetch one record to see the structure
    const { data, error } = await supabaseAdmin
      .from('form_templates')
      .select('*')
      .limit(1)

    if (error) {
      console.error('❌ Error querying table:', error.message)
      console.log('\nTable might not exist. Checking if we can create it...')
      return
    }

    if (!data || data.length === 0) {
      console.log('📊 Table exists but is empty')
      console.log('Cannot determine column structure from data.')
      console.log('\nTrying to insert a test record to see expected columns...')

      // Try to create with controller's expected format
      const { data: testData, error: testError } = await supabaseAdmin
        .from('form_templates')
        .insert({
          template_name: 'TEST',
          file_path: '/test',
          file_url: 'http://test.com',
          original_filename: 'test.pdf',
          page_count: 1,
          file_size: 100,
          signature_positions: [],
          is_active: true
        })
        .select()

      if (testError) {
        console.error('❌ Insert test failed:', testError.message)
        console.log('\nExpected columns based on controller:')
        console.log('  - template_name')
        console.log('  - file_path')
        console.log('  - file_url')
        console.log('  - original_filename')
        console.log('  - page_count')
        console.log('  - file_size')
        console.log('  - signature_positions')
        console.log('  - is_active')
        console.log('  - deleted_at')
      } else {
        console.log('✅ Test insert successful!')
        console.log('\nCurrent columns:')
        console.log(Object.keys(testData[0]))

        // Clean up test record
        await supabaseAdmin
          .from('form_templates')
          .delete()
          .eq('template_name', 'TEST')
      }
    } else {
      console.log('✅ Table exists with data')
      console.log('\nCurrent columns:')
      console.log(Object.keys(data[0]))
      console.log('\nSample record:')
      console.log(JSON.stringify(data[0], null, 2))
    }
  } catch (err) {
    console.error('❌ Unexpected error:', err)
  }
}

checkSchema()
  .then(() => process.exit(0))
  .catch(err => {
    console.error(err)
    process.exit(1)
  })
