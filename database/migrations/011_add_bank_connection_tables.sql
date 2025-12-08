-- Bank Hapoalim PSD2 Connection Tables
-- Migration: 011_add_bank_connection_tables.sql
-- Created: 2025-12-07

-- ============================================================================
-- 1. BANK CONNECTIONS TABLE
-- Store user's bank connection credentials and consent info
-- ============================================================================
CREATE TABLE IF NOT EXISTS bank_connections (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE UNIQUE,
  bank_name VARCHAR(100) NOT NULL DEFAULT 'Bank Hapoalim',
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMPTZ,
  consent_id VARCHAR(255),
  consent_expires_at TIMESTAMPTZ,
  account_ids TEXT[], -- Array of connected account IDs
  last_sync_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bank_connections_user ON bank_connections(user_id);

-- ============================================================================
-- 2. BANK OAUTH STATES TABLE
-- Temporary storage for OAuth state tokens (CSRF protection)
-- ============================================================================
CREATE TABLE IF NOT EXISTS bank_oauth_states (
  state VARCHAR(255) PRIMARY KEY,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_bank_oauth_states_user ON bank_oauth_states(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_oauth_states_expires ON bank_oauth_states(expires_at);

-- ============================================================================
-- 3. ADD SOURCE COLUMN TO FINANCE_IMPORTS IF NOT EXISTS
-- Track whether import came from file upload or bank sync
-- ============================================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'finance_imports' AND column_name = 'source'
  ) THEN
    ALTER TABLE finance_imports ADD COLUMN source VARCHAR(50) DEFAULT 'file_upload';
  END IF;
END $$;

-- ============================================================================
-- Enable Row Level Security
-- ============================================================================
ALTER TABLE bank_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_oauth_states ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS Policies - Users can only see their own data
-- ============================================================================

-- Bank connections policies
CREATE POLICY bank_connections_select ON bank_connections
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY bank_connections_insert ON bank_connections
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY bank_connections_update ON bank_connections
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY bank_connections_delete ON bank_connections
  FOR DELETE USING (auth.uid() = user_id);

-- Bank OAuth states policies
CREATE POLICY bank_oauth_states_select ON bank_oauth_states
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY bank_oauth_states_insert ON bank_oauth_states
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY bank_oauth_states_delete ON bank_oauth_states
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- Service Role Bypass (for backend access)
-- ============================================================================
-- Note: The backend uses supabaseAdmin with service role, which bypasses RLS

-- ============================================================================
-- Cleanup job for expired OAuth states (optional - run periodically)
-- ============================================================================
-- DELETE FROM bank_oauth_states WHERE expires_at < NOW();

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON TABLE bank_connections IS 'Stores Bank Hapoalim PSD2 connection credentials and consent info per user';
COMMENT ON TABLE bank_oauth_states IS 'Temporary OAuth state tokens for CSRF protection during bank connection flow';
COMMENT ON COLUMN bank_connections.access_token IS 'PSD2 API access token (encrypted at rest by Supabase)';
COMMENT ON COLUMN bank_connections.refresh_token IS 'PSD2 API refresh token for renewing access';
COMMENT ON COLUMN bank_connections.consent_id IS 'Bank consent ID for account access (valid 90 days)';
COMMENT ON COLUMN bank_connections.account_ids IS 'Array of connected bank account IDs/IBANs';
