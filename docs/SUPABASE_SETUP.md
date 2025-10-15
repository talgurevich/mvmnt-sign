# Supabase Setup Guide

## Step 1: Run Database Migrations

You need to run the SQL migration files in your Supabase project to create all the tables, indexes, views, and security policies.

### Instructions:

1. **Open Supabase Dashboard**
   - Go to: https://supabase.com/dashboard
   - Select your project: `meqwsahhtxwihdqazesi`

2. **Navigate to SQL Editor**
   - In the left sidebar, click on **"SQL Editor"**
   - Click **"New query"** button

3. **Run Migration 1: Initial Schema**
   - Open the file: `database/migrations/001_initial_schema.sql`
   - Copy ALL the contents
   - Paste into the SQL Editor
   - Click **"Run"** button at the bottom right
   - Wait for confirmation: "Success. No rows returned"

   This creates:
   - 9 tables (users, customers, form_templates, etc.)
   - All indexes for performance
   - 3 database views for dashboard
   - Triggers for auto-updates

4. **Run Migration 2: RLS Policies**
   - Click **"New query"** again
   - Open the file: `database/migrations/002_rls_policies.sql`
   - Copy ALL the contents
   - Paste into the SQL Editor
   - Click **"Run"** button
   - Wait for confirmation

   This creates:
   - Row Level Security policies
   - Access controls for admin vs public users
   - Helper functions for token validation

## Step 2: Create Storage Buckets

You need to create 2 storage buckets for file uploads.

### Instructions:

1. **Navigate to Storage**
   - In the left sidebar, click on **"Storage"**

2. **Create "form-templates" bucket**
   - Click **"New bucket"** button
   - Name: `form-templates`
   - Set as **Private** (not public)
   - Click **"Create bucket"**

3. **Create "signed-documents" bucket**
   - Click **"New bucket"** button again
   - Name: `signed-documents`
   - Set as **Private** (not public)
   - Click **"Create bucket"**

4. **Configure Bucket Policies (Optional for now)**
   - We'll handle access via signed URLs from the backend
   - RLS will be configured later if needed

## Step 3: Verify Setup

Run this query in SQL Editor to verify tables were created:

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

You should see:
- audit_log
- customer_form_settings
- customer_settings
- customers
- form_requests
- form_templates
- signatures
- signed_documents
- users

## Step 4: Test Connection from Backend

Once migrations are complete, you can test the connection:

```bash
cd backend
npm install
npm run dev
```

Visit http://localhost:3000/health to verify the backend is running.

## Troubleshooting

### Error: "relation already exists"
- Tables were already created. You can either:
  1. Drop all tables and re-run migrations
  2. Skip migration 1 if tables exist

### Error: "permission denied"
- Make sure you're logged into the correct Supabase project
- Verify your service role key is correct in `.env`

### Storage bucket errors
- Bucket names must be lowercase and use hyphens (not underscores)
- Buckets must be unique across your project

## Next Steps

After completing this setup:
1. Install backend dependencies: `cd backend && npm install`
2. Start the backend server: `npm run dev`
3. Test the API: http://localhost:3000/api/test

Your database is now ready for the application! 🎉
