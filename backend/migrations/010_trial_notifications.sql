-- Migration: 010_trial_notifications.sql
-- Purpose: Add trial notifications automation setting
-- Created: 2025-12-09

-- Insert trial notifications automation setting
INSERT INTO automation_settings (id, name, description, is_enabled, config)
VALUES (
  'trial_notifications',
  'התראות אימוני ניסיון',
  'התראה על אימוני ניסיון חדשים ותזכורת 10 שעות לפני האימון',
  true,
  '{"check_interval_minutes": 10, "reminder_hours_before": 10, "notify_admin": true}'
)
ON CONFLICT (id) DO NOTHING;

-- Add trial_notifications to admin recipients event types
UPDATE notification_admin_recipients
SET event_types = array_append(event_types, 'trial_notifications')
WHERE NOT ('trial_notifications' = ANY(event_types));
