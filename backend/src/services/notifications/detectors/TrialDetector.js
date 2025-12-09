/**
 * TrialDetector
 * Detects new trial registrations and trials needing reminders
 */

const BaseDetector = require('./BaseDetector');
const arboxService = require('../../arboxService');

class TrialDetector extends BaseDetector {
  constructor(stateManager) {
    super(stateManager);
    this.eventType = 'trial_notifications';
  }

  /**
   * Fetch trials for the next 7 days
   */
  async fetchTrialsData() {
    const today = new Date();
    const endDate = new Date();
    endDate.setDate(today.getDate() + 7);

    const fromDate = today.toISOString().split('T')[0];
    const toDate = endDate.toISOString().split('T')[0];

    console.log(`[${this.eventType}] Fetching trials from ${fromDate} to ${toDate}`);

    const trials = await arboxService.getTrials(fromDate, toDate);

    if (!Array.isArray(trials) || trials.length === 0) {
      console.log(`[${this.eventType}] No trials found`);
      return [];
    }

    console.log(`[${this.eventType}] Found ${trials.length} trials`);

    return trials.map(trial => ({
      id: trial.id,
      odayuser_fk: trial.user_fk,
      firstName: trial.first_name || '',
      lastName: trial.last_name || '',
      fullName: `${trial.first_name || ''} ${trial.last_name || ''}`.trim(),
      phone: trial.phone || '',
      email: trial.email || '',
      date: trial.date,
      time: trial.time,
      className: trial.name,
      coach: trial.coach,
      coachPhone: trial.coach_phone,
      location: trial.location,
      status: trial.status,
      checkedIn: trial.checked_in === 1,
      source: trial.bs_name,
      scheduleId: trial.schedule_id,
      createdAt: trial.created_at
    }));
  }

  /**
   * Detect new trials and trials needing reminders
   */
  async detect() {
    const notifications = [];

    const currentTrials = await this.fetchTrialsData();
    if (currentTrials.length === 0) {
      return notifications;
    }

    // Get stored state (previous trial IDs)
    const entityKey = 'all_trials';
    const previousState = await this.stateManager.getPreviousState(this.eventType, entityKey);

    const previousTrialIds = previousState?.stateData?.trialIds || [];
    const previousRemindersSent = previousState?.stateData?.remindersSent || [];
    const currentTrialIds = currentTrials.map(t => t.id);

    // FIRST RUN: If no previous state, just initialize without notifications for new trials
    // (but still send reminders for trials within the window)
    const isFirstRun = !previousState || previousTrialIds.length === 0;

    if (isFirstRun) {
      console.log(`[${this.eventType}] First run - initializing state with ${currentTrialIds.length} existing trials`);
    }

    // 1. Detect NEW trial registrations (skip on first run)
    const newTrialIds = isFirstRun ? [] : currentTrialIds.filter(id => !previousTrialIds.includes(id));

    console.log(`[${this.eventType}] Previous trials: ${previousTrialIds.length}, Current: ${currentTrialIds.length}, New: ${newTrialIds.length}`);

    if (newTrialIds.length > 0) {
      const newTrials = currentTrials.filter(t => newTrialIds.includes(t.id));

      console.log(`[${this.eventType}] Detected ${newTrials.length} new trial registration(s)`);

      notifications.push({
        type: 'new_trial',
        eventType: this.eventType,
        entityId: 'new_trials',
        entityKey: `new_trials_${Date.now()}`,
        recipients: newTrials,
        data: {
          trialCount: newTrials.length,
          trials: newTrials,
          detectedAt: new Date().toISOString()
        },
        metadata: {
          detectedAt: new Date().toISOString(),
          previousCount: previousTrialIds.length,
          currentCount: currentTrialIds.length
        }
      });
    }

    // 2. Detect trials needing 10-hour reminder
    const now = new Date();
    const reminderWindowHours = 10;
    const reminderWindow = new Date(now.getTime() + reminderWindowHours * 60 * 60 * 1000);

    const trialsNeedingReminder = currentTrials.filter(trial => {
      // Skip if already sent reminder
      if (previousRemindersSent.includes(trial.id)) {
        return false;
      }

      // Parse trial datetime
      const trialDateTime = new Date(`${trial.date}T${trial.time}`);

      // Check if trial is in the future and within reminder window
      return trialDateTime > now && trialDateTime <= reminderWindow;
    });

    if (trialsNeedingReminder.length > 0) {
      console.log(`[${this.eventType}] ${trialsNeedingReminder.length} trial(s) need reminder`);

      notifications.push({
        type: 'trial_reminder',
        eventType: this.eventType,
        entityId: 'trial_reminders',
        entityKey: `trial_reminders_${Date.now()}`,
        recipients: trialsNeedingReminder,
        data: {
          trialCount: trialsNeedingReminder.length,
          trials: trialsNeedingReminder,
          reminderWindowHours,
          detectedAt: new Date().toISOString()
        },
        metadata: {
          detectedAt: new Date().toISOString(),
          reminderWindowHours
        }
      });

      // Add these trials to reminders sent list
      previousRemindersSent.push(...trialsNeedingReminder.map(t => t.id));
    }

    // Save current state for next comparison
    await this.stateManager.saveState(
      this.eventType,
      'all_trials',
      entityKey,
      {
        trialIds: currentTrialIds,
        remindersSent: previousRemindersSent,
        lastChecked: new Date().toISOString()
      }
    );

    return notifications;
  }
}

module.exports = TrialDetector;
