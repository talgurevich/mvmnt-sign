/**
 * Notification System Exports
 */

const NotificationOrchestrator = require('./NotificationOrchestrator');
const StateManager = require('./StateManager');
const WaitlistCapacityDetector = require('./detectors/WaitlistCapacityDetector');
const EmailChannel = require('./channels/EmailChannel');

module.exports = {
  NotificationOrchestrator,
  StateManager,
  detectors: {
    WaitlistCapacityDetector
  },
  channels: {
    EmailChannel
  }
};
