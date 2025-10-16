# Database Migration: Make File Fields Nullable

## What This Migration Does

This migration modifies the `form_templates` table to make file-related fields nullable, allowing the creation of text-only templates without file uploads.

## Why It's Needed

The application has been updated to support rich text templates created directly in a text editor, without requiring PDF or document uploads. However, the database schema currently requires file-related fields to be non-null, causing errors when creating text-only templates.

## Migration SQL

```sql
ALTER TABLE form_templates
ALTER COLUMN original_filename DROP NOT NULL,
ALTER COLUMN file_path DROP NOT NULL,
ALTER COLUMN file_url DROP NOT NULL,
ALTER COLUMN page_count DROP NOT NULL,
ALTER COLUMN file_size DROP NOT NULL;
```

## How to Run This Migration

### Option 1: Supabase SQL Editor (Recommended - Easiest)

1. Go to your Supabase project dashboard at https://supabase.com/dashboard
2. Navigate to the SQL Editor (left sidebar)
3. Click "New query"
4. Copy and paste the SQL from `007_make_file_fields_nullable.sql`
5. Click "Run" to execute the migration
6. Verify success - you should see "Success. No rows returned"

### Option 2: Run Migration Script

1. Get your database connection string from Supabase:
   - Go to Project Settings → Database
   - Find "Connection string" and copy the "URI" format
   - Replace `[YOUR-PASSWORD]` with your actual database password

2. Add it to your `.env` file:
   ```
   DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.meqwsahhtxwihdqazesi.supabase.co:5432/postgres
   ```

3. Run the migration script:
   ```bash
   cd backend
   node scripts/run-migration.js
   ```

## Verification

After running the migration, try creating a new form template through the Forms page. The template creation should now work successfully without requiring file uploads.

## Rollback (If Needed)

If you need to revert this migration:

```sql
ALTER TABLE form_templates
ALTER COLUMN original_filename SET NOT NULL,
ALTER COLUMN file_path SET NOT NULL,
ALTER COLUMN file_url SET NOT NULL,
ALTER COLUMN page_count SET NOT NULL,
ALTER COLUMN file_size SET NOT NULL;
```

Note: This rollback will fail if there are any records with NULL values in these fields.
