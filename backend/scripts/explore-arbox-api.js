#!/usr/bin/env node

/**
 * Arbox API Explorer
 *
 * Tests various Arbox API endpoints to understand the data structure
 */

require('dotenv').config();
const arboxService = require('../src/services/arboxService');

async function exploreArboxAPI() {
  console.log('🔍 Exploring Arbox API endpoints...\n');

  try {
    // Test 1: Get Users
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('1. Testing /users endpoint:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    try {
      const users = await arboxService.getUsers();
      console.log(`✅ Success! Found ${Array.isArray(users) ? users.length : 0} users`);

      if (Array.isArray(users) && users.length > 0) {
        console.log('\nSample user object (first record):');
        console.log(JSON.stringify(users[0], null, 2));

        // Check if membership info is in user object
        if (users[0].membership || users[0].subscription || users[0].box) {
          console.log('\n💡 Membership data found in user object!');
        }
      }
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
    }

    console.log('\n');

    // Test 2: Get Active Members
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('2. Testing /reports/active-members endpoint:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    try {
      const activeMembers = await arboxService.getActiveMembers();
      console.log(`✅ Success! Found ${Array.isArray(activeMembers) ? activeMembers.length : 0} active members`);

      if (Array.isArray(activeMembers) && activeMembers.length > 0) {
        console.log('\nSample active member object:');
        console.log(JSON.stringify(activeMembers[0], null, 2));
      }
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
    }

    console.log('\n');

    // Test 3: Get Memberships Data
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('3. Testing /users/membershipsData endpoint:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    try {
      const memberships = await arboxService.getMembershipsData();
      console.log(`✅ Success! Found ${Array.isArray(memberships) ? memberships.length : 0} membership records`);

      if (Array.isArray(memberships) && memberships.length > 0) {
        console.log('\nSample membership object:');
        console.log(JSON.stringify(memberships[0], null, 2));
      }
    } catch (error) {
      console.error(`❌ Error: ${error.message}`);
    }

    console.log('\n');

    // Test 4: Try alternative endpoints
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('4. Testing alternative endpoints:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const alternativeEndpoints = [
      '/memberships',
      '/subscriptions',
      '/boxes',
      '/api/v2/users/membershipsData',
      '/api/v2/memberships'
    ];

    for (const endpoint of alternativeEndpoints) {
      try {
        console.log(`\nTrying: ${endpoint}`);
        const response = await arboxService.client.get(endpoint);
        const data = response.data;
        console.log(`✅ Success! Found ${Array.isArray(data) ? data.length : 'N/A'} records`);

        if (Array.isArray(data) && data.length > 0) {
          console.log('Sample object:');
          console.log(JSON.stringify(data[0], null, 2).substring(0, 500) + '...');
        }
      } catch (error) {
        console.error(`❌ Failed: ${error.response?.status || error.message}`);
      }
    }

    console.log('\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🏁 API Exploration Complete');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  } catch (error) {
    console.error('Fatal error during exploration:', error.message);
    process.exit(1);
  }
}

// Run the script
if (require.main === module) {
  exploreArboxAPI()
    .then(() => process.exit(0))
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = exploreArboxAPI;
