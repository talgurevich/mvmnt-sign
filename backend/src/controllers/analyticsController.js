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

/**
 * Get new members over time (monthly signups)
 */
exports.getMembersOverTime = catchAsync(async (req, res) => {
  console.log('Fetching new members over time...');

  const users = await arboxService.getUsers();
  const membersWithStartDate = users.filter(user => user.start && user.membership_type_name);

  // Get number of months to look back (default 12)
  const monthsBack = parseInt(req.query.months) || 12;

  // Generate array of months to analyze
  const months = [];
  const now = new Date();

  for (let i = monthsBack - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

    months.push({
      date,
      monthEnd,
      label: date.toLocaleString('he-IL', { year: 'numeric', month: 'short' }),
      count: 0,
      byCategory: {}
    });
  }

  // For each month, count new members who joined that month
  months.forEach(month => {
    membersWithStartDate.forEach(user => {
      const startDate = new Date(user.start);

      // Check if member joined during this month
      if (startDate >= month.date && startDate <= month.monthEnd) {
        month.count++;

        // Also track by category
        const category = categorizeMembership(user.membership_type_name);
        if (!month.byCategory[category]) {
          month.byCategory[category] = 0;
        }
        month.byCategory[category]++;
      }
    });
  });

  res.json({
    months: months.map(m => ({
      label: m.label,
      date: m.date,
      newMembers: m.count,
      byCategory: m.byCategory
    })),
    totalWithStartDate: membersWithStartDate.length
  });
});

/**
 * Get new leads over time (monthly lead creation)
 */
exports.getLeadsOverTime = catchAsync(async (req, res) => {
  console.log('Fetching new leads over time...');

  const leads = await arboxService.getLeads();
  const leadsWithCreatedDate = leads.filter(lead => lead.created_at);

  // Get number of months to look back (default 12)
  const monthsBack = parseInt(req.query.months) || 12;

  // Generate array of months to analyze
  const months = [];
  const now = new Date();

  for (let i = monthsBack - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

    months.push({
      date,
      monthEnd,
      label: date.toLocaleString('he-IL', { year: 'numeric', month: 'short' }),
      count: 0,
      bySource: {}
    });
  }

  // For each month, count new leads created that month
  months.forEach(month => {
    leadsWithCreatedDate.forEach(lead => {
      const createdDate = new Date(lead.created_at);

      // Check if lead was created during this month
      if (createdDate >= month.date && createdDate <= month.monthEnd) {
        month.count++;

        // Also track by source
        const source = lead.lead_source || 'Unknown';
        if (!month.bySource[source]) {
          month.bySource[source] = 0;
        }
        month.bySource[source]++;
      }
    });
  });

  res.json({
    months: months.map(m => ({
      label: m.label,
      date: m.date,
      newLeads: m.count,
      bySource: m.bySource
    })),
    totalLeads: leadsWithCreatedDate.length
  });
});

/**
 * Get member churn over time (monthly cancellations)
 */
exports.getChurnOverTime = catchAsync(async (req, res) => {
  console.log('Fetching churn over time...');

  const users = await arboxService.getUsers();
  const membersWithEndDate = users.filter(user => user.end && user.membership_type_name);

  // Get number of months to look back (default 12)
  const monthsBack = parseInt(req.query.months) || 12;

  // Generate array of months to analyze
  const months = [];
  const now = new Date();

  for (let i = monthsBack - 1; i >= 0; i--) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

    months.push({
      date,
      monthEnd,
      label: date.toLocaleString('he-IL', { year: 'numeric', month: 'short' }),
      count: 0,
      byCategory: {}
    });
  }

  // For each month, count members who churned (ended) that month
  months.forEach(month => {
    membersWithEndDate.forEach(user => {
      const endDate = new Date(user.end);

      // Check if member churned during this month
      if (endDate >= month.date && endDate <= month.monthEnd) {
        month.count++;

        // Also track by category
        const category = categorizeMembership(user.membership_type_name);
        if (!month.byCategory[category]) {
          month.byCategory[category] = 0;
        }
        month.byCategory[category]++;
      }
    });
  });

  res.json({
    months: months.map(m => ({
      label: m.label,
      date: m.date,
      churnedMembers: m.count,
      byCategory: m.byCategory
    })),
    totalWithEndDate: membersWithEndDate.length
  });
});
