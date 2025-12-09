#!/usr/bin/env node

/**
 * Membership Statistics Script
 *
 * Fetches membership data from Arbox API and calculates:
 * - Total number of active memberships
 * - Number of active memberships per membership type
 * - Breakdown by status
 */

require('dotenv').config();
const arboxService = require('../src/services/arboxService');

async function calculateMembershipStats() {
  try {
    console.log('Fetching users data from Arbox...\n');

    // Fetch users data (which includes membership information)
    const users = await arboxService.getUsers();

    if (!Array.isArray(users)) {
      throw new Error('Invalid response format from Arbox API');
    }

    console.log(`Total users fetched: ${users.length}\n`);

    // Initialize statistics object
    const stats = {
      total: users.length,
      byMembershipType: {},
      byStatus: {},
      activeMemberships: 0,
      usersWithoutMembership: 0,
      expiredMemberships: 0,
      currentDate: new Date()
    };

    // Process each user record
    users.forEach(user => {
      const membershipType = user.membership_type_name || 'No Membership';
      const isActive = user.active === 1 || user.active === true;
      const endDate = user.end ? new Date(user.end) : null;
      const isExpired = endDate && endDate < stats.currentDate;

      // Track users without membership type
      if (!user.membership_type_name) {
        stats.usersWithoutMembership++;
      }

      // Track expired memberships
      if (isExpired) {
        stats.expiredMemberships++;
      }

      // Count by membership type
      if (!stats.byMembershipType[membershipType]) {
        stats.byMembershipType[membershipType] = {
          total: 0,
          active: 0,
          inactive: 0,
          expired: 0,
          users: []
        };
      }
      stats.byMembershipType[membershipType].total++;

      if (isActive) {
        stats.byMembershipType[membershipType].active++;
        stats.activeMemberships++;
      } else {
        stats.byMembershipType[membershipType].inactive++;
      }

      if (isExpired) {
        stats.byMembershipType[membershipType].expired++;
      }

      // Store sample users for each membership type (first 3)
      if (stats.byMembershipType[membershipType].users.length < 3) {
        stats.byMembershipType[membershipType].users.push({
          name: `${user.first_name} ${user.last_name}`,
          email: user.email,
          phone: user.phone,
          active: isActive,
          end: user.end
        });
      }

      // Count by active status
      const status = isActive ? 'Active' : 'Inactive';
      if (!stats.byStatus[status]) {
        stats.byStatus[status] = 0;
      }
      stats.byStatus[status]++;
    });

    // Display results
    console.log('═══════════════════════════════════════════════════════');
    console.log('           MEMBERSHIP STATISTICS REPORT');
    console.log('═══════════════════════════════════════════════════════\n');

    console.log(`📊 Total Users: ${stats.total}`);
    console.log(`✅ Active Users: ${stats.activeMemberships}`);
    console.log(`❌ Inactive Users: ${stats.total - stats.activeMemberships}`);
    console.log(`⏰ Expired Memberships: ${stats.expiredMemberships}`);
    console.log(`❓ Users Without Membership Type: ${stats.usersWithoutMembership}\n`);

    console.log('───────────────────────────────────────────────────────');
    console.log('BREAKDOWN BY MEMBERSHIP TYPE:');
    console.log('───────────────────────────────────────────────────────\n');

    // Sort membership types by active count (descending)
    const sortedTypes = Object.entries(stats.byMembershipType)
      .sort((a, b) => b[1].active - a[1].active);

    sortedTypes.forEach(([type, counts]) => {
      console.log(`📌 ${type}:`);
      console.log(`   Total: ${counts.total}`);
      console.log(`   Active: ${counts.active}`);
      console.log(`   Inactive: ${counts.inactive}`);
      console.log(`   Expired: ${counts.expired}`);

      // Show sample users
      if (counts.users.length > 0) {
        console.log(`   Sample users:`);
        counts.users.forEach(u => {
          const statusIcon = u.active ? '✅' : '❌';
          console.log(`     ${statusIcon} ${u.name} (${u.phone}) - End: ${u.end || 'N/A'}`);
        });
      }
      console.log('');
    });

    console.log('───────────────────────────────────────────────────────');
    console.log('BREAKDOWN BY STATUS:');
    console.log('───────────────────────────────────────────────────────\n');

    Object.entries(stats.byStatus)
      .sort((a, b) => b[1] - a[1])
      .forEach(([status, count]) => {
        console.log(`${status}: ${count}`);
      });

    console.log('\n═══════════════════════════════════════════════════════\n');

    // Return stats for programmatic use
    return stats;

  } catch (error) {
    console.error('❌ Error calculating membership statistics:', error.message);

    if (error.response) {
      console.error('API Response Status:', error.response.status);
      console.error('API Response Data:', error.response.data);
    }

    process.exit(1);
  }
}

// Run the script if executed directly
if (require.main === module) {
  calculateMembershipStats()
    .then(() => {
      console.log('✅ Statistics calculation completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('Fatal error:', error);
      process.exit(1);
    });
}

module.exports = calculateMembershipStats;
