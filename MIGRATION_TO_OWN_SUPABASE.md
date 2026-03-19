# Migration Guide: Move to Your Own Supabase Project

## Overview
This guide moves your backend from Lovable Cloud to your own Supabase project.

---

## Step 1: Create Your Supabase Project
1. Go to https://supabase.com → New Project
2. Note your **Project URL**, **Anon Key**, and **Service Role Key**

## Step 2: Run the Schema + Data Migration
1. Go to SQL Editor in your Supabase Dashboard
2. Paste and run the contents of `alhamd_academy_full_migration.sql` (exported file)
3. This creates all tables, functions, triggers, RLS policies, and existing data

## Step 3: Deploy Edge Functions
```bash
# Install Supabase CLI: https://supabase.com/docs/guides/cli
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase functions deploy
```

## Step 4: Set Edge Function Secrets
In your Supabase Dashboard → Project Settings → Edge Functions → Secrets:
- `SUPABASE_ANON_KEY` (your anon key)
- `SUPABASE_SERVICE_ROLE_KEY` (your service role key)
- `SUPABASE_URL` (your project URL)

## Step 5: Recreate Auth Users
Auth users **cannot** be migrated via SQL. Recreate them:

### Admin Account
```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/setup-admin \
  -H "Content-Type: application/json" \
  -d '{"email":"info@alhamdacademy.net","password":"YOUR_SECURE_PASSWORD"}'
```

### Manager & Teacher Accounts
Log in as admin in the app, then use the UI to create:
- **Manager**: مشرف الأكاديمية
- **Teacher**: أحمد محمد العلي (phone: +201234567890, rate: $15/hr)

## Step 6: Create Storage Bucket
In Supabase Dashboard → Storage → New Bucket:
- Name: `teacher-files`
- Public: Yes

## Step 7: Update Environment Variables

### For Lovable Preview
Update `.env` in the project root:
```
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=YOUR_ANON_KEY
VITE_SUPABASE_PROJECT_ID=YOUR_PROJECT_REF
```

### For Vercel
In Vercel Dashboard → Project Settings → Environment Variables:
- `VITE_SUPABASE_URL` = `https://YOUR_PROJECT.supabase.co`
- `VITE_SUPABASE_PUBLISHABLE_KEY` = your anon key
- `VITE_SUPABASE_PROJECT_ID` = your project ref

### For GitHub (no secrets stored)
Only code and schema files — never secrets.

## Step 8: Update config.toml
Update `supabase/config.toml`:
```toml
project_id = "YOUR_PROJECT_REF"
```

---

## What Was Migrated ✅
- All 15 tables with full schema
- All RLS policies (40+ policies)
- All database functions (6 functions)
- All triggers (12 triggers)
- All views (teachers_self_view)
- Existing data (1 trial booking record)
- Storage bucket configuration
- All 12 edge functions (in `supabase/functions/`)

## What Was NOT Migrated ⚠️
- **Auth users** — Must be recreated via edge functions (see Step 5)
- **User passwords** — Cannot be exported; users need new passwords
- **Storage files** — Download from old project, re-upload to new
- **Secrets** — Must be set manually in new project (see Step 4)

## What Requires Manual Backup ⚠️
- Download any files from the `teacher-files` storage bucket
- Note down any custom secrets you added

---

## Architecture After Migration
```
GitHub (source of truth)
  ├── src/                    # React frontend
  ├── supabase/functions/     # Edge Functions
  ├── supabase/schema.sql     # Full schema reference
  └── DEPLOYMENT.md           # Setup guide

Your Supabase Project (your backend)
  ├── Auth (user accounts)
  ├── Database (PostgreSQL)
  ├── Storage (teacher-files)
  └── Edge Functions

Vercel (hosting)
  └── Deploys from GitHub
```
