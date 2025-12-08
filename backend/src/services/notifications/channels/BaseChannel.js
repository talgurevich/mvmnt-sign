/**
 * BaseChannel
 * Abstract base class for notification channels
 */

class BaseChannel {
  constructor() {
    this.channelName = 'base'; // Override in subclass
  }

  /**
   * Check if channel is configured (override in subclass)
   * @returns {boolean}
   */
  isConfigured() {
    return false;
  }

  /**
   * Send a notification (override in subclass)
   * @param {object} recipient - { email, phone, name }
   * @param {object} notification - Full notification payload
   * @returns {Promise<{ success: boolean, externalId?: string, error?: string }>}
   */
  async send(recipient, notification) {
    throw new Error('send must be implemented');
  }

  /**
   * Render notification content (override in subclass)
   * @param {object} notification
   * @returns {{ subject: string, html: string, text: string }}
   */
  renderTemplate(notification) {
    throw new Error('renderTemplate must be implemented');
  }
}

module.exports = BaseChannel;
