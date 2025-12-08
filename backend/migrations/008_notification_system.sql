-- Migration: 008_notification_system.sql
-- Purpose: Create tables for the notification system
-- Created: 2025-12-08

-- =============================================================================
-- Table: notification_event_state
-- Purpose: Store the last known state to detect changes
-- =============================================================================
CREATE TABLE IF NOT EXISTS notification_event_state (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(100) NOT NULL,
  entity_key VARCHAR(200) NOT NULL,
  state_data JSONB NOT NULL,
  state_hash VARCHAR(64),
  last_checked_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  UNIQUE(event_type, entity_key)
);

CREATE INDEX IF NOT EXISTS idx_event_state_type_key ON notification_event_state(event_type, entity_key);
CREATE INDEX IF NOT EXISTS idx_event_state_last_checked ON notification_event_state(last_checked_at);

-- =============================================================================
-- Table: notification_history
-- Purpose: Log all sent notifications
-- =============================================================================
CREATE TABLE IF NOT EXISTS notification_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type VARCHAR(50) NOT NULL,
  event_id VARCHAR(100),
  entity_key VARCHAR(200),
  subscriber_id VARCHAR(100),
  recipient_email VARCHAR(200),
  recipient_phone VARCHAR(50),
  channel VARCHAR(50) NOT NULL,
  notification_type VARCHAR(100) NOT NULL,
  subject VARCHAR(500),
  message TEXT NOT NULL,
  metadata JSONB,
  status VARCHAR(50) DEFAULT 'pending',
  external_id VARCHAR(200),
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_history_event ON notification_history(event_type, event_id);
CREATE INDEX IF NOT EXISTS idx_notification_history_recipient ON notification_history(recipient_email);
CREATE INDEX IF NOT EXISTS idx_notification_history_status ON notification_history(status);
CREATE INDEX IF NOT EXISTS idx_notification_history_created ON notification_history(created_at DESC);

-- =============================================================================
-- Table: notification_job_runs
-- Purpose: Track scheduler job executions
-- =============================================================================
CREATE TABLE IF NOT EXISTS notification_job_runs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_name VARCHAR(100) NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  status VARCHAR(50) DEFAULT 'running',
  events_detected INTEGER DEFAULT 0,
  notifications_sent INTEGER DEFAULT 0,
  error_message TEXT,
  metadata JSONB
);

CREATE INDEX IF NOT EXISTS idx_job_runs_name_started ON notification_job_runs(job_name, started_at DESC);

-- =============================================================================
-- Table: notification_admin_recipients
-- Purpose: Admin users who receive notifications
-- =============================================================================
CREATE TABLE IF NOT EXISTS notification_admin_recipients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email VARCHAR(200) NOT NULL UNIQUE,
  name VARCHAR(200),
  event_types VARCHAR(50)[] DEFAULT ARRAY['waitlist_capacity'],
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_admin_recipients_active ON notification_admin_recipients(is_active) WHERE is_active = true;
