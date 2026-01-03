/**
 * Explore various Arbox API endpoints to find subscription data
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const axios = require('axios');

const baseURL = process.env.ARBOX_API_URL;
const apiKey = process.env.ARBOX_API_KEY;

const client = axios.create({
  baseURL,
  headers: { 'apiKey': apiKey, 'Content-Type': 'application/json' },
  timeout: 30000
});

async function tryEndpoint(name, method, url, data = null) {
  try {
    const config = { method, url };
    if (data) config.data = data;

    const response = await client.request(config);
    const result = response.data;

    const count = Array.isArray(result) ? result.length :
                  (result?.data && Array.isArray(result.data)) ? result.data.length :
                  'N/A';

    console.log(`✓ ${name}: ${count} records`);

    // Show sample if has data
    const items = Array.isArray(result) ? result : result?.data;
    if (items && items.length > 0) {
      console.log('  Sample fields:', Object.keys(items[0]).slice(0, 10).join(', '));

      // Look for expiry-related fields
      const keys = Object.keys(items[0]);
      const expiryFields = keys.filter(k =>
        k.toLowerCase().includes('end') ||
        k.toLowerCase().includes('expir') ||
        k.toLowerCase().includes('valid') ||
        k.toLowerCase().includes('membership')
      );
      if (expiryFields.length > 0) {
        console.log('  Expiry-related fields:', expiryFields.join(', '));
        console.log('  Sample values:');
        expiryFields.forEach(f => {
          console.log(`    ${f}: ${items[0][f]}`);
        });
      }
    }
    return result;
  } catch (error) {
    console.log(`✗ ${name}: ${error.response?.status || error.message}`);
    return null;
  }
}

async function explore() {
  console.log('Exploring Arbox API endpoints...\n');
  console.log('Base URL:', baseURL);
  console.log('');

  // Try various potential endpoints
  await tryEndpoint('Active Members', 'GET', '/reports/active-members');
  await tryEndpoint('Users', 'GET', '/users');
  await tryEndpoint('Memberships Data', 'GET', '/users/membershipsData');
  await tryEndpoint('Memberships', 'GET', '/memberships');
  await tryEndpoint('Subscriptions', 'GET', '/subscriptions');
  await tryEndpoint('User Memberships', 'GET', '/userMemberships');
  await tryEndpoint('Membership Plans', 'GET', '/membershipPlans');
  await tryEndpoint('Products', 'GET', '/products');
  await tryEndpoint('Reports Memberships', 'GET', '/reports/memberships');
  await tryEndpoint('Reports Expiring', 'GET', '/reports/expiring-memberships');
  await tryEndpoint('Reports Ending Soon', 'GET', '/reports/ending-soon');

  // Try with date params
  const today = new Date().toISOString().split('T')[0];
  const nextMonth = new Date(Date.now() + 30*24*60*60*1000).toISOString().split('T')[0];

  await tryEndpoint('Expiring (with dates)', 'GET', `/reports/expiring-memberships?fromDate=${today}&toDate=${nextMonth}`);
}

explore();
