/**
 * StateManager
 * Handles storing and comparing event state in Supabase for change detection
 */

const crypto = require('crypto');
const { supabaseAdmin } = require('../../config/supabase');

class StateManager {
  /**
   * Generate a hash for state comparison
   */
  static hashState(stateData) {
    const normalized = JSON.stringify(stateData, Object.keys(stateData).sort());
    return crypto.createHash('sha256').update(normalized).digest('hex');
  }

  /**
   * Get the previous state for an entity
   * @param {string} eventType - e.g., 'waitlist_capacity'
   * @param {string} entityKey - e.g., 'schedule_12345_08-12-2025_18:00'
   */
  async getPreviousState(eventType, entityKey) {
    const { data, error } = await supabaseAdmin
      .from('notification_event_state')
      .select('*')
      .eq('event_type', eventType)
      .eq('entity_key', entityKey)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = not found
      throw error;
    }

    return data;
  }

  /**
   * Save or update state
   */
  async saveState(eventType, entityId, entityKey, stateData) {
    const stateHash = StateManager.hashState(stateData);

    const { data, error } = await supabaseAdmin
      .from('notification_event_state')
      .upsert({
        event_type: eventType,
        entity_id: entityId,
        entity_key: entityKey,
        state_data: stateData,
        state_hash: stateHash,
        last_checked_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'event_type,entity_key'
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  /**
   * Check if state has changed
   * @returns {{ hasChanged: boolean, previousState: object|null, isNew: boolean, changes: object }}
   */
  async compareState(eventType, entityKey, newStateData) {
    const previousState = await this.getPreviousState(eventType, entityKey);
    const newHash = StateManager.hashState(newStateData);

    if (!previousState) {
      return {
        hasChanged: false, // First time seeing this - don't trigger notification
        isNew: true,
        previousState: null,
        changes: null
      };
    }

    const hasChanged = previousState.state_hash !== newHash;

    return {
      hasChanged,
      isNew: false,
      previousState: previousState.state_data,
      previousHash: previousState.state_hash,
      newHash,
      changes: hasChanged ? { before: previousState.state_data, after: newStateData } : null
    };
  }

  /**
   * Clean up old state records (sessions that have passed)
   */
  async cleanupOldStates(eventType, olderThanDays = 7) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

    const { error } = await supabaseAdmin
      .from('notification_event_state')
      .delete()
      .eq('event_type', eventType)
      .lt('last_checked_at', cutoffDate.toISOString());

    if (error) throw error;
  }

  /**
   * Get all states for an event type
   */
  async getAllStates(eventType) {
    const { data, error } = await supabaseAdmin
      .from('notification_event_state')
      .select('*')
      .eq('event_type', eventType)
      .order('last_checked_at', { ascending: false });

    if (error) throw error;
    return data || [];
  }
}

module.exports = StateManager;
