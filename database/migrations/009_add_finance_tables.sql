-- Financial Dashboard - Bank Transactions Tables
-- Migration: 009_add_finance_tables.sql
-- Created: 2025-12-04

-- ============================================================================
-- 1. FINANCE IMPORTS TABLE
-- Track imported Excel files
-- ============================================================================
CREATE TABLE IF NOT EXISTS finance_imports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  file_name VARCHAR(255) NOT NULL,
  date_range_start DATE,
  date_range_end DATE,
  total_transactions INTEGER DEFAULT 0,
  total_income DECIMAL(12,2) DEFAULT 0,
  total_expenses DECIMAL(12,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_finance_imports_user ON finance_imports(user_id);
CREATE INDEX IF NOT EXISTS idx_finance_imports_created ON finance_imports(created_at DESC);

-- ============================================================================
-- 2. BANK TRANSACTIONS TABLE
-- Store parsed transactions from Excel files
-- ============================================================================
CREATE TABLE IF NOT EXISTS bank_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  import_id UUID REFERENCES finance_imports(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  transaction_date DATE NOT NULL,
  type VARCHAR(100),
  details TEXT,
  reference VARCHAR(100),
  debit DECIMAL(12,2) DEFAULT 0,
  credit DECIMAL(12,2) DEFAULT 0,
  balance DECIMAL(12,2),
  recipient VARCHAR(255),
  purpose TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bank_transactions_user ON bank_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_date ON bank_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_import ON bank_transactions(import_id);
CREATE INDEX IF NOT EXISTS idx_bank_transactions_type ON bank_transactions(type);

-- ============================================================================
-- Enable Row Level Security
-- ============================================================================
ALTER TABLE finance_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE bank_transactions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- RLS Policies - Users can only see their own data
-- ============================================================================

-- Finance imports policies
CREATE POLICY finance_imports_select ON finance_imports
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY finance_imports_insert ON finance_imports
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY finance_imports_delete ON finance_imports
  FOR DELETE USING (auth.uid() = user_id);

-- Bank transactions policies
CREATE POLICY bank_transactions_select ON bank_transactions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY bank_transactions_insert ON bank_transactions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY bank_transactions_delete ON bank_transactions
  FOR DELETE USING (auth.uid() = user_id);

-- ============================================================================
-- Comments
-- ============================================================================
COMMENT ON TABLE finance_imports IS 'Tracks imported bank Excel files with summary stats';
COMMENT ON TABLE bank_transactions IS 'Individual bank transactions parsed from Excel files';
