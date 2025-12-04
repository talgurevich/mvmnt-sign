-- Fix Finance Tables - Remove foreign key constraints to users table
-- Migration: 010_fix_finance_foreign_keys.sql
-- The user_id references Supabase auth.users, not the public.users table

-- Drop foreign key constraints
ALTER TABLE finance_imports DROP CONSTRAINT IF EXISTS finance_imports_user_id_fkey;
ALTER TABLE bank_transactions DROP CONSTRAINT IF EXISTS bank_transactions_user_id_fkey;

-- The user_id column now stores auth.uid() without FK constraint
-- RLS policies already use auth.uid() = user_id for security
