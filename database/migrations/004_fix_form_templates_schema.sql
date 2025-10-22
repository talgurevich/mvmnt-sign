-- Fix form_templates schema to match controller expectations
-- This migration handles any current state (partial or full original schema)
-- Migration: 004_fix_form_templates_schema
-- Date: 2025-10-15

-- Step 1: Add missing columns if they don't exist
ALTER TABLE form_templates
  ADD COLUMN IF NOT EXISTS template_name TEXT,
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS page_count INTEGER,
  ADD COLUMN IF NOT EXISTS file_path TEXT,
  ADD COLUMN IF NOT EXISTS file_url TEXT,
  ADD COLUMN IF NOT EXISTS original_filename TEXT,
  ADD COLUMN IF NOT EXISTS file_size INTEGER,
  ADD COLUMN IF NOT EXISTS signature_positions JSONB DEFAULT '[]'::jsonb;

-- Step 2: Migrate data from old columns to new ones (if old columns exist)
DO $$
BEGIN
  -- Migrate name -> template_name
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='form_templates' AND column_name='name') THEN
    UPDATE form_templates SET template_name = name WHERE template_name IS NULL;
  END IF;

  -- Migrate pdf_file_path -> file_path
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='form_templates' AND column_name='pdf_file_path') THEN
    UPDATE form_templates SET file_path = pdf_file_path WHERE file_path IS NULL;
  END IF;

  -- Migrate pdf_file_url -> file_url
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='form_templates' AND column_name='pdf_file_url') THEN
    UPDATE form_templates SET file_url = pdf_file_url WHERE file_url IS NULL;
  END IF;

  -- Migrate original_file_name -> original_filename
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='form_templates' AND column_name='original_file_name') THEN
    UPDATE form_templates SET original_filename = original_file_name WHERE original_filename IS NULL;
  END IF;

  -- Migrate signature_config -> signature_positions
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='form_templates' AND column_name='signature_config') THEN
    UPDATE form_templates
    SET signature_positions = COALESCE(signature_config, '[]'::jsonb)
    WHERE signature_positions = '[]'::jsonb OR signature_positions IS NULL;
  END IF;
END $$;

-- Step 3: Make new columns NOT NULL after data migration
ALTER TABLE form_templates
  ALTER COLUMN template_name SET NOT NULL,
  ALTER COLUMN file_path SET NOT NULL,
  ALTER COLUMN original_filename SET NOT NULL;

-- Step 4: Drop old columns (if they exist)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='form_templates' AND column_name='name') THEN
    ALTER TABLE form_templates DROP COLUMN name;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='form_templates' AND column_name='pdf_file_path') THEN
    ALTER TABLE form_templates DROP COLUMN pdf_file_path;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='form_templates' AND column_name='pdf_file_url') THEN
    ALTER TABLE form_templates DROP COLUMN pdf_file_url;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='form_templates' AND column_name='original_file_name') THEN
    ALTER TABLE form_templates DROP COLUMN original_file_name;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='form_templates' AND column_name='original_file_path') THEN
    ALTER TABLE form_templates DROP COLUMN original_file_path;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='form_templates' AND column_name='original_file_type') THEN
    ALTER TABLE form_templates DROP COLUMN original_file_type;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='form_templates' AND column_name='signature_config') THEN
    ALTER TABLE form_templates DROP COLUMN signature_config;
  END IF;
END $$;

-- Step 5: Add indexes
CREATE INDEX IF NOT EXISTS idx_form_templates_deleted ON form_templates(deleted_at);
CREATE INDEX IF NOT EXISTS idx_form_templates_active ON form_templates(is_active) WHERE deleted_at IS NULL;

-- Step 6: Recreate views with correct column names
DROP VIEW IF EXISTS recent_document_events CASCADE;
DROP VIEW IF EXISTS customer_document_summary CASCADE;
DROP VIEW IF EXISTS dashboard_stats CASCADE;

-- Recreate Recent Document Events View
CREATE VIEW recent_document_events AS
SELECT
  al.id,
  al.event_type,
  al.created_at,
  c.id as customer_id,
  c.first_name,
  c.last_name,
  c.phone_number,
  fr.id as form_request_id,
  fr.status,
  ft.template_name as form_template_name,
  u.full_name as admin_name
FROM audit_log al
LEFT JOIN customers c ON al.customer_id = c.id
LEFT JOIN form_requests fr ON al.form_request_id = fr.id
LEFT JOIN form_templates ft ON fr.form_template_id = ft.id AND ft.deleted_at IS NULL
LEFT JOIN users u ON al.user_id = u.id
WHERE al.created_at >= NOW() - INTERVAL '30 days'
ORDER BY al.created_at DESC
LIMIT 100;

-- Recreate Customer Document Summary View
CREATE VIEW customer_document_summary AS
SELECT
  c.id as customer_id,
  c.first_name,
  c.last_name,
  c.email,
  c.phone_number,
  COUNT(fr.id) as total_documents,
  COUNT(CASE WHEN fr.status = 'signed' THEN 1 END) as signed_count,
  COUNT(CASE WHEN fr.status = 'sent' THEN 1 END) as pending_count,
  COUNT(CASE WHEN fr.status = 'opened' THEN 1 END) as opened_count,
  COUNT(CASE WHEN fr.status = 'expired' THEN 1 END) as expired_count,
  MAX(fr.created_at) as last_document_sent,
  MAX(fr.signed_at) as last_document_signed,
  cs.default_form_template_id,
  ft.template_name as default_form_name
FROM customers c
LEFT JOIN form_requests fr ON c.id = fr.customer_id
LEFT JOIN customer_settings cs ON c.id = cs.customer_id
LEFT JOIN form_templates ft ON cs.default_form_template_id = ft.id AND ft.deleted_at IS NULL
WHERE c.deleted_at IS NULL
GROUP BY c.id, cs.default_form_template_id, ft.template_name;

-- Recreate Dashboard Statistics View
CREATE VIEW dashboard_stats AS
SELECT
  (SELECT COUNT(*) FROM customers WHERE deleted_at IS NULL) as total_customers,
  (SELECT COUNT(*) FROM form_templates WHERE is_active = true AND deleted_at IS NULL) as active_templates,
  (SELECT COUNT(*) FROM form_requests WHERE created_at >= NOW() - INTERVAL '30 days') as documents_sent_30d,
  (SELECT COUNT(*) FROM form_requests WHERE status = 'signed' AND signed_at >= NOW() - INTERVAL '30 days') as documents_signed_30d,
  (SELECT COUNT(*) FROM form_requests WHERE status IN ('sent', 'opened')) as pending_signatures,
  (SELECT COUNT(*) FROM form_requests WHERE status = 'sent' AND token_expires_at <= NOW() + INTERVAL '3 days') as expiring_soon,
  (SELECT AVG(EXTRACT(EPOCH FROM (signed_at - created_at))/3600) FROM form_requests WHERE status = 'signed' AND created_at >= NOW() - INTERVAL '30 days') as avg_signature_time_hours;
