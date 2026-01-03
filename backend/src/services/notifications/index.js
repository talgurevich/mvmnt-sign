/**
 * Notification System Exports
 */

const NotificationOrchestrator = require('./NotificationOrchestrator');
const StateManager = require('./StateManager');
const WaitlistCapacityDetector = require('./detectors/WaitlistCapacityDetector');
const EmailChannel = require('./channels/EmailChannel');
const WhatsAppChannel = require('./channels/WhatsAppChannel');
const GreenApiChannel = require('./channels/GreenApiChannel');

// Singleton orchestrator for immediate notifications
let orchestratorInstance = null;

const getOrchestrator = () => {
  if (!orchestratorInstance) {
    orchestratorInstance = new NotificationOrchestrator();
  }
  return orchestratorInstance;
};

/**
 * Send a document signed notification immediately
 * @param {Object} data - Notification data
 * @param {string} data.customerName - Customer name
 * @param {string} data.templateName - Document template name
 * @param {string} data.signerName - Name of the person who signed
 * @param {string} data.signedAt - Formatted date/time of signing
 * @param {string} data.signedDocumentUrl - URL to the signed document (optional)
 * @param {string} data.formRequestId - Form request ID for tracking
 */
/**
 * Send a new order notification immediately
 * @param {Object} data - Notification data
 * @param {string} data.orderId - Order ID
 * @param {string} data.customerName - Customer name
 * @param {Array} data.items - Order items
 * @param {number} data.totalAmount - Total amount in NIS
 */
const sendNewOrderNotification = async (data) => {
  try {
    const orchestrator = getOrchestrator();

    // Build items summary
    const itemsSummary = data.items.map(item =>
      `${item.name} (${item.color}, ${item.size}) x${item.quantity}`
    ).join('\n');

    const notification = {
      eventType: 'new_order_notifications',
      type: 'new_order',
      entityId: data.orderId,
      entityKey: `new_order_${data.orderId}`,
      data: {
        orderId: data.orderId,
        customerName: data.customerName,
        items: data.items,
        itemsSummary,
        itemsCount: data.items.length,
        totalAmount: data.totalAmount
      },
      metadata: {
        detectedAt: new Date().toISOString()
      }
    };

    const sentCount = await orchestrator.sendNotification(notification);
    console.log(`[NewOrderNotification] Sent ${sentCount} notifications for order ${data.orderId}`);

    return { success: true, sentCount };
  } catch (error) {
    console.error('[NewOrderNotification] Error sending notification:', error);
    return { success: false, error: error.message };
  }
};

const sendDocumentSignedNotification = async (data) => {
  try {
    const orchestrator = getOrchestrator();

    const notification = {
      eventType: 'document_signed_notifications',
      type: 'document_signed',
      entityId: data.formRequestId,
      entityKey: `document_signed_${data.formRequestId}`,
      data: {
        customerName: data.customerName,
        templateName: data.templateName,
        signerName: data.signerName,
        signedAt: data.signedAt,
        signedDocumentUrl: data.signedDocumentUrl
      },
      metadata: {
        detectedAt: new Date().toISOString()
      }
    };

    const sentCount = await orchestrator.sendNotification(notification);
    console.log(`[DocumentSignedNotification] Sent ${sentCount} notifications for form request ${data.formRequestId}`);

    return { success: true, sentCount };
  } catch (error) {
    console.error('[DocumentSignedNotification] Error sending notification:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  NotificationOrchestrator,
  StateManager,
  detectors: {
    WaitlistCapacityDetector
  },
  channels: {
    EmailChannel,
    WhatsAppChannel,
    GreenApiChannel
  },
  sendDocumentSignedNotification,
  sendNewOrderNotification
};
