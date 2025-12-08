/**
 * Leads Controller
 * Handles leads management from Arbox API
 */

const arboxService = require('../services/arboxService');
const { catchAsync } = require('../middleware/errorHandler');

/**
 * Get all leads with optional status filter
 * GET /api/leads
 */
exports.getAllLeads = catchAsync(async (req, res) => {
  console.log('Fetching all leads...');

  const { status, source, days } = req.query;

  // Fetch leads from Arbox
  const [leads, convertedLeads, lostLeads] = await Promise.all([
    arboxService.getLeads(),
    arboxService.getConvertedLeads(),
    arboxService.getLostLeads()
  ]);

  // Filter by days if specified (e.g., last 7 days, 30 days)
  let filteredLeads = leads;
  if (days) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - parseInt(days));
    filteredLeads = leads.filter(lead => {
      const createdAt = new Date(lead.created_at);
      return createdAt >= cutoffDate;
    });
  }

  // Filter by status if specified
  if (status) {
    filteredLeads = filteredLeads.filter(lead =>
      lead.lead_status?.toLowerCase() === status.toLowerCase()
    );
  }

  // Filter by source if specified
  if (source) {
    filteredLeads = filteredLeads.filter(lead =>
      lead.lead_source?.toLowerCase().includes(source.toLowerCase())
    );
  }

  // Sort by created_at descending (newest first)
  filteredLeads.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  res.json({
    leads: filteredLeads,
    totalLeads: leads.length,
    totalConverted: convertedLeads.length,
    totalLost: lostLeads.length,
    filteredCount: filteredLeads.length
  });
});

/**
 * Get leads summary/statistics
 * GET /api/leads/stats
 */
exports.getLeadsStats = catchAsync(async (req, res) => {
  console.log('Fetching leads statistics...');

  const [leads, convertedLeads, lostLeads] = await Promise.all([
    arboxService.getLeads(),
    arboxService.getConvertedLeads(),
    arboxService.getLostLeads()
  ]);

  // Count by status
  const statusCounts = {};
  leads.forEach(lead => {
    const status = lead.lead_status || 'Unknown';
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });

  // Count by source
  const sourceCounts = {};
  leads.forEach(lead => {
    const source = lead.lead_source || 'Unknown';
    sourceCounts[source] = (sourceCounts[source] || 0) + 1;
  });

  // Count by location
  const locationCounts = {};
  leads.forEach(lead => {
    const location = lead.location || 'Unknown';
    locationCounts[location] = (locationCounts[location] || 0) + 1;
  });

  // Count by owner
  const ownerCounts = {};
  leads.forEach(lead => {
    const owner = lead.lead_owner_first_name
      ? `${lead.lead_owner_first_name} ${lead.lead_owner_last_name || ''}`.trim()
      : 'Unassigned';
    ownerCounts[owner] = (ownerCounts[owner] || 0) + 1;
  });

  // Lost reasons breakdown
  const lostReasons = {};
  lostLeads.forEach(lead => {
    const reason = lead.lost_reason || 'Unknown';
    lostReasons[reason] = (lostReasons[reason] || 0) + 1;
  });

  // Calculate conversion rate
  const totalProcessed = convertedLeads.length + lostLeads.length;
  const conversionRate = totalProcessed > 0
    ? ((convertedLeads.length / totalProcessed) * 100).toFixed(1)
    : 0;

  // New leads in last 7 days
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const newLeadsLast7Days = leads.filter(lead =>
    new Date(lead.created_at) >= sevenDaysAgo
  ).length;

  // New leads in last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const newLeadsLast30Days = leads.filter(lead =>
    new Date(lead.created_at) >= thirtyDaysAgo
  ).length;

  res.json({
    totals: {
      activeLeads: leads.length,
      convertedLeads: convertedLeads.length,
      lostLeads: lostLeads.length,
      conversionRate: parseFloat(conversionRate)
    },
    recent: {
      last7Days: newLeadsLast7Days,
      last30Days: newLeadsLast30Days
    },
    byStatus: Object.entries(statusCounts)
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count),
    bySource: Object.entries(sourceCounts)
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count),
    byLocation: Object.entries(locationCounts)
      .map(([location, count]) => ({ location, count }))
      .sort((a, b) => b.count - a.count),
    byOwner: Object.entries(ownerCounts)
      .map(([owner, count]) => ({ owner, count }))
      .sort((a, b) => b.count - a.count),
    lostReasons: Object.entries(lostReasons)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count),
    lastUpdated: new Date().toISOString()
  });
});

/**
 * Get converted leads
 * GET /api/leads/converted
 */
exports.getConvertedLeads = catchAsync(async (req, res) => {
  console.log('Fetching converted leads...');

  const convertedLeads = await arboxService.getConvertedLeads();

  // Sort by created_at descending
  convertedLeads.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  res.json({
    leads: convertedLeads,
    total: convertedLeads.length
  });
});

/**
 * Get lost leads
 * GET /api/leads/lost
 */
exports.getLostLeads = catchAsync(async (req, res) => {
  console.log('Fetching lost leads...');

  const lostLeads = await arboxService.getLostLeads();

  res.json({
    leads: lostLeads,
    total: lostLeads.length
  });
});

/**
 * Get new/uncontacted leads
 * GET /api/leads/new
 */
exports.getNewLeads = catchAsync(async (req, res) => {
  console.log('Fetching new/uncontacted leads...');

  const leads = await arboxService.getLeads();

  // Filter for uncontacted leads
  const newLeads = leads.filter(lead =>
    lead.lead_status === 'Not Contacted' ||
    lead.lead_status === 'New' ||
    !lead.lead_status
  );

  // Sort by created_at descending (newest first)
  newLeads.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  res.json({
    leads: newLeads,
    total: newLeads.length
  });
});
