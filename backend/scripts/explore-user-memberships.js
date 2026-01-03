/**
 * Explore user membership data to find expiring subscriptions
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const arboxService = require('../src/services/arboxService');

async function exploreUserMemberships() {
  console.log('Fetching users with membership data...\n');

  try {
    const users = await arboxService.getUsers();

    console.log(`Found ${users.length} users\n`);

    // Show all fields from first user
    console.log('All fields in user record:');
    console.log(Object.keys(users[0]).join('\n'));

    // Find membership-related fields
    console.log('\n\n--- Sample user with membership data ---');
    const sampleUser = users.find(u => u.end && u.membership_type_name);
    if (sampleUser) {
      console.log(JSON.stringify(sampleUser, null, 2));
    }

    // Find users with future end dates
    const today = new Date();
    const usersWithFutureEnd = users.filter(u => {
      if (!u.end) return false;
      const endDate = new Date(u.end);
      return endDate > today;
    });

    console.log(`\n\nUsers with future membership end dates: ${usersWithFutureEnd.length}`);

    // Find users ending in the next 30 days
    const next30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
    const endingSoon = users.filter(u => {
      if (!u.end) return false;
      const endDate = new Date(u.end);
      return endDate > today && endDate <= next30Days;
    });

    console.log(`Users with membership ending in next 30 days: ${endingSoon.length}`);

    if (endingSoon.length > 0) {
      console.log('\n--- Users ending soon ---');
      endingSoon.slice(0, 5).forEach(u => {
        console.log(`${u.first_name} ${u.last_name} - ${u.membership_type_name} - ends: ${u.end} - phone: ${u.phone}`);
      });
    }

    // Find users ending in next 7 days
    const next7Days = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    const endingVerySOon = users.filter(u => {
      if (!u.end) return false;
      const endDate = new Date(u.end);
      return endDate > today && endDate <= next7Days;
    });

    console.log(`\nUsers with membership ending in next 7 days: ${endingVerySOon.length}`);

    if (endingVerySOon.length > 0) {
      console.log('\n--- Users ending in 7 days ---');
      endingVerySOon.forEach(u => {
        console.log(`${u.first_name} ${u.last_name} - ${u.membership_type_name} - ends: ${u.end} - phone: ${u.phone}`);
      });
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

exploreUserMemberships();
