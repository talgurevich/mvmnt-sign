/**
 * BaseDetector
 * Abstract base class for event detectors
 */

class BaseDetector {
  constructor(stateManager) {
    this.stateManager = stateManager;
    this.eventType = 'base'; // Override in subclass
  }

  /**
   * Fetch current data from source (override in subclass)
   * @returns {Promise<Array>} Array of entities to check
   */
  async fetchCurrentData() {
    throw new Error('fetchCurrentData must be implemented');
  }

  /**
   * Extract state data from an entity (override in subclass)
   * @returns {{ entityId: string, entityKey: string, stateData: object }}
   */
  extractStateData(entity) {
    throw new Error('extractStateData must be implemented');
  }

  /**
   * Determine if a change should trigger a notification (override in subclass)
   * @returns {boolean}
   */
  shouldNotify(comparison, entity) {
    throw new Error('shouldNotify must be implemented');
  }

  /**
   * Build notification payload (override in subclass)
   * @returns {{ type: string, recipients: Array, data: object }}
   */
  buildNotificationPayload(comparison, entity) {
    throw new Error('buildNotificationPayload must be implemented');
  }

  /**
   * Run the detection cycle
   * @returns {Promise<Array>} Array of notification payloads
   */
  async detect() {
    const notifications = [];
    const entities = await this.fetchCurrentData();

    console.log(`[${this.eventType}] Checking ${entities.length} entities`);

    for (const entity of entities) {
      try {
        const { entityId, entityKey, stateData } = this.extractStateData(entity);

        // Compare with previous state
        const comparison = await this.stateManager.compareState(
          this.eventType,
          entityKey,
          stateData
        );

        // Check if we should notify
        if (comparison.hasChanged && this.shouldNotify(comparison, entity)) {
          console.log(`[${this.eventType}] Change detected for ${entityKey}`);
          const payload = this.buildNotificationPayload(comparison, entity);
          notifications.push(payload);
        }

        // Always update state after checking
        await this.stateManager.saveState(
          this.eventType,
          entityId,
          entityKey,
          stateData
        );

      } catch (error) {
        console.error(`[${this.eventType}] Error processing entity:`, error.message);
        // Continue processing other entities
      }
    }

    return notifications;
  }
}

module.exports = BaseDetector;
