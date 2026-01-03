-- Migration: 012_membership_expiry_automation.sql
-- Purpose: Add membership expiry notification automation setting
-- Created: 2025-12-09

INSERT INTO automation_settings (id, name, description, is_enabled, config)
VALUES (
  'membership_expiry_notifications',
  'התראות סיום מנוי',
  'שליחת התראה כאשר מנוי של לקוח עומד לפוג בשבוע הקרוב',
  true,
  '{"expiry_window_days": 7, "notify_admin": true}'
)
ON CONFLICT (id) DO NOTHING;
