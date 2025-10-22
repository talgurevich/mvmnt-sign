-- Update form_templates schema to match controller expectations
-- Migration: 003_update_form_templates_schema
-- Date: 2025-10-15

-- Add missing columns
ALTER TABLE form_templates
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS page_count INTEGER;

-- Rename columns to match controller
ALTER TABLE form_templates
  RENAME COLUMN name TO template_name;

ALTER TABLE form_templates
  RENAME COLUMN pdf_file_path TO file_path;

ALTER TABLE form_templates
  RENAME COLUMN pdf_file_url TO file_url;

ALTER TABLE form_templates
  RENAME COLUMN original_file_name TO original_filename;

-- Rename signature_config to signature_positions and change default
ALTER TABLE form_templates
  RENAME COLUMN signature_config TO signature_positions;

ALTER TABLE form_templates
  ALTER COLUMN signature_positions SET DEFAULT '[]'::jsonb;

-- Update existing records to use empty array instead of old format
UPDATE form_templates
  SET signature_positions = '[]'::jsonb
  WHERE signature_positions IS NOT NULL;

-- Add index for soft delete
CREATE INDEX IF NOT EXISTS idx_form_templates_deleted ON form_templates(deleted_at);

-- Update views to use new column names
DROP VIEW IF EXISTS recent_document_events;
DROP VIEW IF EXISTS customer_document_summary;
DROP VIEW IF EXISTS dashboard_stats;

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
LEFT JOIN form_templates ft ON fr.form_template_id = ft.id
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
LEFT JOIN form_templates ft ON cs.default_form_template_id = ft.id
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
