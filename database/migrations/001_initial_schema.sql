-- Arbox-WhatsApp Form Signing Service - Database Schema
-- Hebrew-only system for Israeli market
-- Created: 2025-10-15

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. USERS TABLE
-- ============================================================================
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  google_id TEXT UNIQUE,
  full_name TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP
);

-- ============================================================================
-- 2. CUSTOMERS TABLE
-- ============================================================================
CREATE TABLE customers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  arbox_customer_id TEXT UNIQUE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone_number TEXT NOT NULL,

  -- Additional fields
  date_of_birth DATE,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  country TEXT DEFAULT 'IL',

  -- Status tracking
  is_active BOOLEAN DEFAULT true,
  last_document_sent_at TIMESTAMP,
  last_document_signed_at TIMESTAMP,
  total_documents_sent INTEGER DEFAULT 0,
  total_documents_signed INTEGER DEFAULT 0,

  -- Soft delete
  deleted_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Customers indexes
CREATE INDEX idx_customers_active ON customers(is_active) WHERE deleted_at IS NULL;
CREATE INDEX idx_customers_phone ON customers(phone_number);
CREATE INDEX idx_customers_email ON customers(email);
CREATE INDEX idx_customers_last_activity ON customers(last_document_sent_at DESC);
CREATE INDEX idx_customers_arbox_id ON customers(arbox_customer_id);

-- ============================================================================
-- 3. FORM TEMPLATES TABLE
-- ============================================================================
CREATE TABLE form_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,

  -- Document storage
  original_file_path TEXT NOT NULL,
  original_file_name TEXT NOT NULL,
  original_file_type TEXT NOT NULL, -- 'pdf', 'doc', 'docx'
  pdf_file_path TEXT NOT NULL,
  pdf_file_url TEXT,
  file_size INTEGER,

  -- Signature configuration
  signature_config JSONB NOT NULL DEFAULT '{"positions": [{"page": 1, "x": 100, "y": 100, "width": 200, "height": 60}]}',

  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_form_templates_active ON form_templates(is_active);
CREATE INDEX idx_form_templates_created_by ON form_templates(created_by);

-- ============================================================================
-- 4. CUSTOMER SETTINGS TABLE
-- ============================================================================
CREATE TABLE customer_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE UNIQUE,
  default_form_template_id UUID REFERENCES form_templates(id),
  settings JSONB DEFAULT '{}',
  notes TEXT,
  updated_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_customer_settings_customer ON customer_settings(customer_id);
CREATE INDEX idx_customer_settings_template ON customer_settings(default_form_template_id);

-- ============================================================================
-- 5. CUSTOMER FORM SETTINGS TABLE (many-to-many)
-- ============================================================================
CREATE TABLE customer_form_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) ON DELETE CASCADE,
  form_template_id UUID REFERENCES form_templates(id) ON DELETE SET NULL,
  is_default BOOLEAN DEFAULT false,
  notes TEXT,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(customer_id, form_template_id)
);

CREATE INDEX idx_customer_form_settings_customer ON customer_form_settings(customer_id);
CREATE INDEX idx_customer_form_settings_template ON customer_form_settings(form_template_id);

-- ============================================================================
-- 6. FORM REQUESTS TABLE
-- ============================================================================
CREATE TABLE form_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  customer_id UUID REFERENCES customers(id) NOT NULL,
  form_template_id UUID REFERENCES form_templates(id) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('created', 'sent', 'opened', 'signed', 'declined', 'expired', 'failed')),

  -- Signing access
  signing_token TEXT UNIQUE NOT NULL,
  signing_url TEXT NOT NULL,
  token_expires_at TIMESTAMP NOT NULL,

  -- Tracking (manual send tracking)
  sent_by UUID REFERENCES users(id),
  sent_at TIMESTAMP,
  sent_via TEXT, -- 'whatsapp', 'email', 'sms', 'manual'

  -- Engagement tracking
  opened_at TIMESTAMP,
  signed_at TIMESTAMP,
  declined_at TIMESTAMP,
  ip_address TEXT,
  user_agent TEXT,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_form_requests_status ON form_requests(status);
CREATE INDEX idx_form_requests_customer ON form_requests(customer_id);
CREATE INDEX idx_form_requests_token ON form_requests(signing_token);
CREATE INDEX idx_form_requests_expires ON form_requests(token_expires_at);
CREATE INDEX idx_form_requests_created ON form_requests(created_at DESC);

-- ============================================================================
-- 7. SIGNATURES TABLE
-- ============================================================================
CREATE TABLE signatures (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  form_request_id UUID REFERENCES form_requests(id) ON DELETE CASCADE,
  signature_data TEXT NOT NULL, -- Base64 encoded signature image
  signature_type TEXT DEFAULT 'drawn' CHECK (signature_type IN ('drawn', 'typed', 'uploaded')),
  signer_name TEXT NOT NULL,
  signer_ip TEXT,
  page_number INTEGER DEFAULT 1,
  position_x FLOAT,
  position_y FLOAT,
  signed_at TIMESTAMP DEFAULT NOW(),
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_signatures_request ON signatures(form_request_id);

-- ============================================================================
-- 8. SIGNED DOCUMENTS TABLE
-- ============================================================================
CREATE TABLE signed_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  form_request_id UUID REFERENCES form_requests(id) ON DELETE CASCADE,
  file_path TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  mime_type TEXT DEFAULT 'application/pdf',
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_signed_documents_request ON signed_documents(form_request_id);

-- ============================================================================
-- 9. AUDIT LOG TABLE
-- ============================================================================
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  form_request_id UUID REFERENCES form_requests(id),
  customer_id UUID REFERENCES customers(id),
  event_type TEXT NOT NULL,
  event_data JSONB,
  user_id UUID REFERENCES users(id),
  ip_address TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_log_request ON audit_log(form_request_id);
CREATE INDEX idx_audit_log_customer ON audit_log(customer_id);
CREATE INDEX idx_audit_log_event_type ON audit_log(event_type);
CREATE INDEX idx_audit_log_created ON audit_log(created_at DESC);

-- ============================================================================
-- DATABASE VIEWS
-- ============================================================================

-- Recent Document Events View (for Dashboard)
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
  ft.name as form_template_name,
  u.full_name as admin_name
FROM audit_log al
LEFT JOIN customers c ON al.customer_id = c.id
LEFT JOIN form_requests fr ON al.form_request_id = fr.id
LEFT JOIN form_templates ft ON fr.form_template_id = ft.id
LEFT JOIN users u ON al.user_id = u.id
WHERE al.created_at >= NOW() - INTERVAL '30 days'
ORDER BY al.created_at DESC
LIMIT 100;

-- Customer Document Summary View
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
  ft.name as default_form_name
FROM customers c
LEFT JOIN form_requests fr ON c.id = fr.customer_id
LEFT JOIN customer_settings cs ON c.id = cs.customer_id
LEFT JOIN form_templates ft ON cs.default_form_template_id = ft.id
WHERE c.deleted_at IS NULL
GROUP BY c.id, cs.default_form_template_id, ft.name;

-- Dashboard Statistics View
CREATE VIEW dashboard_stats AS
SELECT
  (SELECT COUNT(*) FROM customers WHERE deleted_at IS NULL) as total_customers,
  (SELECT COUNT(*) FROM form_templates WHERE is_active = true) as active_templates,
  (SELECT COUNT(*) FROM form_requests WHERE created_at >= NOW() - INTERVAL '30 days') as documents_sent_30d,
  (SELECT COUNT(*) FROM form_requests WHERE status = 'signed' AND signed_at >= NOW() - INTERVAL '30 days') as documents_signed_30d,
  (SELECT COUNT(*) FROM form_requests WHERE status IN ('sent', 'opened')) as pending_signatures,
  (SELECT COUNT(*) FROM form_requests WHERE status = 'sent' AND token_expires_at <= NOW() + INTERVAL '3 days') as expiring_soon,
  (SELECT AVG(EXTRACT(EPOCH FROM (signed_at - created_at))/3600) FROM form_requests WHERE status = 'signed' AND created_at >= NOW() - INTERVAL '30 days') as avg_signature_time_hours;

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Update updated_at timestamp automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply update trigger to relevant tables
CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_form_templates_updated_at BEFORE UPDATE ON form_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customer_settings_updated_at BEFORE UPDATE ON customer_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_form_requests_updated_at BEFORE UPDATE ON form_requests
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-update customer document counts
CREATE OR REPLACE FUNCTION update_customer_document_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
    UPDATE customers SET
      total_documents_sent = total_documents_sent + 1,
      last_document_sent_at = NOW()
    WHERE id = NEW.customer_id;

    IF NEW.status = 'signed' THEN
      UPDATE customers SET
        total_documents_signed = total_documents_signed + 1,
        last_document_signed_at = NEW.signed_at
      WHERE id = NEW.customer_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_customer_stats_on_form_request
  AFTER INSERT OR UPDATE ON form_requests
  FOR EACH ROW EXECUTE FUNCTION update_customer_document_stats();

-- ============================================================================
-- INITIAL DATA (Optional)
-- ============================================================================

-- Create default message templates in Hebrew
COMMENT ON TABLE form_requests IS 'Stores document signing requests sent to customers via WhatsApp';
COMMENT ON TABLE customers IS 'Customer data synced from Arbox and manually added';
COMMENT ON TABLE form_templates IS 'Uploaded document templates (DOC/DOCX/PDF) with signature configurations';
COMMENT ON TABLE audit_log IS 'Complete audit trail of all system events';

-- ============================================================================
-- GRANTS (for Supabase RLS - to be configured separately)
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_form_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE form_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE signed_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
