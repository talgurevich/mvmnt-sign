-- Migration: 011_add_phone_to_admin_recipients.sql
-- Purpose: Add phone column for WhatsApp notifications
-- Created: 2025-12-09

-- Add phone column to admin recipients
ALTER TABLE notification_admin_recipients
ADD COLUMN IF NOT EXISTS phone VARCHAR(50);

-- Create index for phone lookups
CREATE INDEX IF NOT EXISTS idx_admin_recipients_phone
ON notification_admin_recipients(phone)
WHERE phone IS NOT NULL;
