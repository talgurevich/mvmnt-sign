/**
 * Explore Arbox memberships data to find subscription expiration info
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const arboxService = require('../src/services/arboxService');

async function exploreMemberships() {
  console.log('Fetching memberships data...\n');

  try {
    const data = await arboxService.getMembershipsData();

    if (!data || !Array.isArray(data)) {
      console.log('Response:', typeof data, data);
      return;
    }

    console.log(`Found ${data.length} membership records\n`);

    // Show first 3 records to understand structure
    console.log('Sample records:');
    data.slice(0, 3).forEach((record, i) => {
      console.log(`\n--- Record ${i + 1} ---`);
      console.log(JSON.stringify(record, null, 2));
    });

    // Look for date-related fields
    if (data.length > 0) {
      const sampleKeys = Object.keys(data[0]);
      console.log('\n\nAll fields in records:');
      console.log(sampleKeys.join(', '));

      // Find fields that might contain dates
      const dateFields = sampleKeys.filter(k =>
        k.toLowerCase().includes('date') ||
        k.toLowerCase().includes('end') ||
        k.toLowerCase().includes('expir') ||
        k.toLowerCase().includes('valid')
      );
      console.log('\n\nPotential date/expiry fields:');
      console.log(dateFields.join(', '));
    }

  } catch (error) {
    console.error('Error:', error.message);
  }
}

exploreMemberships();
