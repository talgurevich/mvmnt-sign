-- Migration: 009_automation_settings.sql
-- Purpose: Store automation on/off settings
-- Created: 2025-12-08

CREATE TABLE IF NOT EXISTS automation_settings (
  id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  description TEXT,
  is_enabled BOOLEAN DEFAULT false,
  config JSONB DEFAULT '{}',
  last_run_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default automation settings
INSERT INTO automation_settings (id, name, description, is_enabled, config)
VALUES (
  'waitlist_capacity_notifications',
  'התראות רשימת המתנה',
  'שליחת התראה כאשר מתפנה מקום בשיעור עם רשימת המתנה',
  true,
  '{"check_interval_minutes": 10, "notify_admin": true}'
)
ON CONFLICT (id) DO NOTHING;
