#!/usr/bin/env node

/**
 * Test all documented Arbox API endpoints to see which ones work
 */

require('dotenv').config();
const arboxService = require('../src/services/arboxService');

async function testAllEndpoints() {
  console.log('Testing all Arbox API endpoints...\n');

  const today = new Date().toISOString().split('T')[0];

  // All documented endpoints from the API docs
  const endpoints = [
    // Leads - should work
    { url: '/leads', desc: 'Get leads' },
    { url: '/statuses', desc: 'Get statuses' },
    { url: '/sources', desc: 'Get sources' },
    { url: '/lostReasons', desc: 'Get lost reasons' },
    { url: '/leads/converted', desc: 'Get converted leads' },
    { url: '/leads/lost', desc: 'Get lost leads' },

    // Users - should work
    { url: '/users', desc: 'Get users' },
    { url: '/users/memberships', desc: 'Get user memberships' },

    // Schedule - testing
    { url: '/schedule/entryFromWaitingList', desc: 'Get waitlist', params: { fDate: today, tDate: today } },
    { url: '/schedule/boxCategories', desc: 'Get box categories' },
    { url: '/schedule/booking/trial', desc: 'Get trial bookings' },

    // Membership
    { url: '/membershipTypes', desc: 'Get membership types' },

    // Locations
    { url: '/locations', desc: 'Get locations' },

    // Custom fields
    { url: '/customFields', desc: 'Get custom fields' },

    // Tasks
    { url: '/tasks', desc: 'Get tasks' },
    { url: '/tasks/types', desc: 'Get task types' },
  ];

  const working = [];
  const notWorking = [];

  for (const ep of endpoints) {
    try {
      const config = { method: 'GET', url: ep.url };
      if (ep.params) config.params = ep.params;

      const res = await arboxService.client.request(config);
      const data = res.data;

      if (data.statusCode && data.statusCode !== 200) {
        notWorking.push({ ...ep, error: data.error?.description || 'API Error' });
        console.log(`❌ ${ep.desc}: API Error`);
      } else {
        const count = Array.isArray(data) ? data.length : (data.data?.length || 'object');
        working.push({ ...ep, count });
        console.log(`✅ ${ep.desc}: ${count} records`);
      }

    } catch (e) {
      notWorking.push({ ...ep, error: `${e.response?.status}: ${e.response?.data?.error || e.message}` });
      console.log(`❌ ${ep.desc}: ${e.response?.status || 'Error'}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));

  console.log('\n✅ WORKING ENDPOINTS:');
  working.forEach(ep => console.log(`   ${ep.url} - ${ep.count} records`));

  console.log('\n❌ NOT WORKING:');
  notWorking.forEach(ep => console.log(`   ${ep.url} - ${ep.error}`));

  // Check if we have schedule access at all
  console.log('\n' + '='.repeat(60));
  console.log('CONCLUSION');
  console.log('='.repeat(60));

  const hasScheduleAccess = working.some(ep => ep.url.includes('schedule'));
  const hasWaitlistAccess = working.some(ep => ep.url.includes('entryFromWaitingList'));

  console.log(`\nSchedule endpoints working: ${hasScheduleAccess ? 'Some' : 'None'}`);
  console.log(`Waitlist access: ${hasWaitlistAccess ? 'Yes' : 'No'}`);

  if (!working.some(ep => ep.url === '/schedule/boxCategories' || ep.url === '/schedule/booking/trial')) {
    console.log('\n⚠️  Your API key may not have full schedule access.');
    console.log('   The waitlist endpoint works, but capacity/booking endpoints do not.');
    console.log('   Contact Arbox support to enable schedule access for your API key.');
  }
}

testAllEndpoints()
  .then(() => process.exit(0))
  .catch(e => {
    console.error('Fatal:', e);
    process.exit(1);
  });
