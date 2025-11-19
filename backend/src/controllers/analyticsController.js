const arboxService = require('../services/arboxService');
const { catchAsync } = require('../middleware/errorHandler');

/**
 * Get membership analytics overview
 */
exports.getAnalyticsOverview = catchAsync(async (req, res) => {
  console.log('Fetching analytics overview...');

  // Fetch all users from Arbox
  const users = await arboxService.getUsers();

  // Filter active members (those with a membership type)
  const activeMembers = users.filter(user => user.membership_type_name);

  // Count total active members
  const totalActiveMembers = activeMembers.length;

  // Group by membership type and count
  const membershipDistribution = {};

  activeMembers.forEach(user => {
    const membershipType = user.membership_type_name;
    if (!membershipDistribution[membershipType]) {
      membershipDistribution[membershipType] = {
        count: 0,
        members: []
      };
    }
    membershipDistribution[membershipType].count++;
    membershipDistribution[membershipType].members.push({
      id: user.id,
      name: `${user.first_name} ${user.last_name}`,
      email: user.email
    });
  });

  // Convert to array format for pie chart
  const membershipTypes = Object.entries(membershipDistribution)
    .map(([type, data]) => ({
      type,
      count: data.count,
      percentage: ((data.count / totalActiveMembers) * 100).toFixed(1)
    }))
    .sort((a, b) => b.count - a.count); // Sort by count descending

  res.json({
    totalActiveMembers,
    totalUsers: users.length,
    membershipTypes,
    lastUpdated: new Date().toISOString()
  });
});

/**
 * Get detailed membership breakdown
 */
exports.getMembershipBreakdown = catchAsync(async (req, res) => {
  console.log('Fetching detailed membership breakdown...');

  const users = await arboxService.getUsers();
  const activeMembers = users.filter(user => user.membership_type_name);

  // Group by membership type with detailed info
  const breakdown = {};

  activeMembers.forEach(user => {
    const membershipType = user.membership_type_name;
    if (!breakdown[membershipType]) {
      breakdown[membershipType] = [];
    }
    breakdown[membershipType].push({
      id: user.id,
      name: `${user.first_name} ${user.last_name}`,
      email: user.email,
      phone: user.phone_number,
      joinDate: user.join_date,
      status: user.status
    });
  });

  res.json({
    breakdown,
    totalTypes: Object.keys(breakdown).length,
    totalMembers: activeMembers.length
  });
});
