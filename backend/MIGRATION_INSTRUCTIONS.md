# 🚨 TWO MIGRATIONS REQUIRED

## Current Issues
1. Creating form templates fails with a 500 error - file-related fields are not nullable
2. Signing documents fails with a 500 error - signatures table is missing `signed_document_id` column

## Quick Fix (3 minutes)

### Step 1: Copy this SQL (both migrations combined)
```sql
-- Migration 007: Make file fields nullable for text-only templates
ALTER TABLE form_templates
ALTER COLUMN original_filename DROP NOT NULL,
ALTER COLUMN file_path DROP NOT NULL,
ALTER COLUMN file_url DROP NOT NULL,
ALTER COLUMN page_count DROP NOT NULL,
ALTER COLUMN file_size DROP NOT NULL;

-- Migration 008: Add signed_document_id to signatures table
ALTER TABLE signatures
ADD COLUMN IF NOT EXISTS signed_document_id UUID REFERENCES signed_documents(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_signatures_signed_document_id ON signatures(signed_document_id);
```

### Step 2: Run it in Supabase
1. Go to https://supabase.com/dashboard
2. Select your project (meqwsahhtxwihdqazesi)
3. Click "SQL Editor" in the left sidebar
4. Click "+ New query"
5. Paste the SQL above
6. Click "Run" or press Cmd+Enter (Mac) / Ctrl+Enter (Windows)
7. You should see "Success. No rows returned"

### Step 3: Test
1. Go to your Forms page and try creating a new template with rich text
2. Send the template to a customer via WhatsApp
3. Customer should be able to sign the document successfully

## What These Migrations Do

### Migration 007
- Makes file-related columns nullable in the `form_templates` table
- Allows creating templates with just text content (no file upload required)
- Enables the new rich text editor functionality

### Migration 008
- Adds `signed_document_id` column to the `signatures` table
- Links signatures to their corresponding signed documents
- Enables text-only templates to be signed without generating PDFs

## Verification
After running both migrations:
1. ✅ Template creation should work without errors
2. ✅ Document signing should work for both PDF and text-only templates

---

**Need help?** The SQL files are available at:
- `backend/migrations/007_make_file_fields_nullable.sql`
- `backend/migrations/008_add_signed_document_id_to_signatures.sql`
