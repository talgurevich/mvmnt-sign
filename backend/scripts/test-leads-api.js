#!/usr/bin/env node

/**
 * Test Arbox Leads API
 */

require('dotenv').config();
const arboxService = require('../src/services/arboxService');

async function testLeadsAPI() {
  console.log('🔍 Testing Arbox Leads API...\n');

  try {
    // Test 1: Get all leads
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('1. Testing /leads endpoint:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    try {
      const leads = await arboxService.getLeads();
      console.log(`✅ Success! Found ${Array.isArray(leads) ? leads.length : 0} leads`);

      if (Array.isArray(leads) && leads.length > 0) {
        console.log('\nSample lead object (first record):');
        console.log(JSON.stringify(leads[0], null, 2));

        console.log('\n📊 Lead fields available:');
        console.log(Object.keys(leads[0]).join(', '));
      } else {
        console.log('⚠️  No leads found');
      }
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
    }

    console.log('\n');

    // Test 2: Get converted leads
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('2. Testing /convertedLeads endpoint:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    try {
      const converted = await arboxService.getConvertedLeads();
      console.log(`✅ Success! Found ${Array.isArray(converted) ? converted.length : 0} converted leads`);

      if (Array.isArray(converted) && converted.length > 0) {
        console.log('\nSample converted lead:');
        console.log(JSON.stringify(converted[0], null, 2));
      }
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
    }

    console.log('\n');

    // Test 3: Get lost leads
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('3. Testing /lostLeads endpoint:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    try {
      const lost = await arboxService.getLostLeads();
      console.log(`✅ Success! Found ${Array.isArray(lost) ? lost.length : 0} lost leads`);

      if (Array.isArray(lost) && lost.length > 0) {
        console.log('\nSample lost lead:');
        console.log(JSON.stringify(lost[0], null, 2));
      }
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
    }

    console.log('\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🏁 API Testing Complete');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  } catch (error) {
    console.error('Fatal error during testing:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  testLeadsAPI()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = testLeadsAPI;
