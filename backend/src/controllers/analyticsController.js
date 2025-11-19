const arboxService = require('../services/arboxService');
const { catchAsync } = require('../middleware/errorHandler');

/**
 * Categorize membership by type
 */
function categorizeMembership(membershipName) {
  const name = (membershipName || '').toLowerCase();

  if (name.includes('pilates')) return 'Pilates';
  if (name.includes('lift') || name.includes('move')) return 'Lift + Move';
  if (name.includes('yoga')) return 'Yoga';
  if (name.includes('teen') || name.includes('נוער')) return 'Teens';
  if (name.includes('open gym')) return 'Open Gym';
  if (name.includes('elite') || name.includes('vip')) return 'Elite VIP';

  return 'Other';
}

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

  // Group by category and count
  const categoryDistribution = {};

  activeMembers.forEach(user => {
    const category = categorizeMembership(user.membership_type_name);
    if (!categoryDistribution[category]) {
      categoryDistribution[category] = {
        count: 0,
        members: []
      };
    }
    categoryDistribution[category].count++;
    categoryDistribution[category].members.push({
      id: user.id,
      name: `${user.first_name} ${user.last_name}`,
      email: user.email,
      originalType: user.membership_type_name
    });
  });

  // Convert to array format for pie chart
  const membershipTypes = Object.entries(categoryDistribution)
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
