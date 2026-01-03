/**
 * NewLeadDetector
 * Detects new leads and sends notification
 */

const BaseDetector = require('./BaseDetector');
const arboxService = require('../../arboxService');

class NewLeadDetector extends BaseDetector {
  constructor(stateManager) {
    super(stateManager);
    this.eventType = 'new_lead_notifications';
  }

  /**
   * Fetch current leads from Arbox
   */
  async fetchCurrentData() {
    console.log(`[${this.eventType}] Fetching leads from Arbox`);

    const leads = await arboxService.getLeads();

    if (!Array.isArray(leads) || leads.length === 0) {
      console.log(`[${this.eventType}] No leads found`);
      return [];
    }

    console.log(`[${this.eventType}] Found ${leads.length} total leads`);

    // Return leads with their relevant data
    return leads.map(lead => ({
      id: lead.id,
      firstName: lead.first_name || '',
      lastName: lead.last_name || '',
      fullName: `${lead.first_name || ''} ${lead.last_name || ''}`.trim(),
      phone: lead.phone || lead.mobile || '',
      email: lead.email || '',
      source: lead.lead_source || 'Unknown',
      status: lead.lead_status || 'New',
      createdAt: lead.created_at,
      notes: lead.notes || ''
    }));
  }

  /**
   * Override detect to handle new leads differently
   * We compare lead IDs to find truly new ones
   */
  async detect() {
    const notifications = [];

    // Get current leads
    const currentLeads = await this.fetchCurrentData();
    if (currentLeads.length === 0) {
      return notifications;
    }

    // Get stored state (previous lead IDs)
    const entityKey = 'all_leads';
    const previousState = await this.stateManager.getPreviousState(this.eventType, entityKey);

    const previousLeadIds = previousState?.state_data?.leadIds || [];
    const currentLeadIds = currentLeads.map(l => l.id);

    // FIRST RUN: If no previous state, just initialize without notifications
    if (!previousState || previousLeadIds.length === 0) {
      console.log(`[${this.eventType}] First run - initializing state with ${currentLeadIds.length} existing leads (no notifications)`);

      await this.stateManager.saveState(
        this.eventType,
        'all_leads',
        entityKey,
        { leadIds: currentLeadIds, lastChecked: new Date().toISOString() }
      );

      return notifications;
    }

    // Find new leads (IDs that weren't in previous state)
    const newLeadIds = currentLeadIds.filter(id => !previousLeadIds.includes(id));

    console.log(`[${this.eventType}] Previous leads: ${previousLeadIds.length}, Current: ${currentLeadIds.length}, New: ${newLeadIds.length}`);

    if (newLeadIds.length > 0) {
      const newLeads = currentLeads.filter(l => newLeadIds.includes(l.id));

      console.log(`[${this.eventType}] Detected ${newLeads.length} new lead(s)`);

      // Create a notification for new leads
      notifications.push({
        type: 'new_lead',
        eventType: this.eventType,
        entityId: 'new_leads',
        entityKey: `new_leads_${Date.now()}`,
        recipients: newLeads,
        data: {
          leadCount: newLeads.length,
          leads: newLeads,
          detectedAt: new Date().toISOString()
        },
        metadata: {
          detectedAt: new Date().toISOString(),
          previousCount: previousLeadIds.length,
          currentCount: currentLeadIds.length
        }
      });
    }

    // Save current state for next comparison
    await this.stateManager.saveState(
      this.eventType,
      'all_leads',
      entityKey,
      { leadIds: currentLeadIds, lastChecked: new Date().toISOString() }
    );

    return notifications;
  }
}

module.exports = NewLeadDetector;
