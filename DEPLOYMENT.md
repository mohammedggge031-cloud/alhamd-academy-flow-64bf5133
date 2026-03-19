# Alhamd Academy - Deployment & Portability Guide

## What's in This Repository

### ✅ Already in GitHub (complete & portable)
- **Frontend code**: All React/TypeScript/Tailwind source code
- **Edge Functions**: All 12 backend functions in `supabase/functions/`
- **Database Migrations**: All 27 incremental migrations in `supabase/migrations/`
- **Full Schema**: Complete database schema in `supabase/schema.sql`
- **Seed Instructions**: Admin setup guide in `supabase/seed.sql`
- **Supabase Config**: `supabase/config.toml` with function settings
- **Vercel Config**: `vercel.json` for deployment

### ⚠️ NOT in GitHub (must be configured manually)
- **Supabase Secrets** (service role key, anon key, project URL)
- **User accounts** (stored in Supabase Auth, not exportable as SQL)
- **Uploaded files** (stored in Supabase Storage `teacher-files` bucket)
- **Actual data** (students, sessions, invoices, etc.)

---

## How to Recreate on a New Supabase Project

### Step 1: Create a new Supabase project
Go to https://supabase.com and create a new project.

### Step 2: Run the schema
Go to SQL Editor in Supabase Dashboard, paste and run `supabase/schema.sql`.

Alternatively, if using Supabase CLI:
```bash
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

### Step 3: Deploy Edge Functions
```bash
supabase functions deploy --project-ref YOUR_PROJECT_REF
```

### Step 4: Create the Admin Account
Call the setup-admin edge function:
```bash
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/setup-admin \
  -H "Content-Type: application/json" \
  -d '{"email":"info@alhamdacademy.net","password":"YOUR_PASSWORD"}'
```

### Step 5: Configure Vercel Environment Variables
In Vercel project settings, add:
- `VITE_SUPABASE_URL` = `https://YOUR_PROJECT.supabase.co`
- `VITE_SUPABASE_PUBLISHABLE_KEY` = your anon/publishable key
- `VITE_SUPABASE_ANON_KEY` = same as above (fallback)
- `VITE_SUPABASE_PROJECT_ID` = your project ref ID

### Step 6: Create Storage Bucket
In Supabase Dashboard > Storage, create a public bucket named `teacher-files`.

---

## What to Back Up Manually

### 1. User Accounts
Export from Supabase Dashboard > Authentication > Users.
You cannot export passwords — users will need password resets on a new project.

### 2. Data (Students, Sessions, etc.)
Export from Supabase Dashboard > Table Editor > Export as CSV for each table:
- students, teachers, sessions, invoices, expenses, etc.

### 3. Uploaded Files
Download files from Supabase Dashboard > Storage > teacher-files bucket.

### 4. Secrets
Note down your current secrets (stored in Supabase project settings):
- `SUPABASE_SERVICE_ROLE_KEY` (needed for edge functions)
- Any other API keys you've added

---

## Architecture Summary

```
GitHub (source of truth)
  ├── src/                    # React frontend
  ├── supabase/
  │   ├── functions/          # 12 Edge Functions (auto-deploy)
  │   ├── migrations/         # 27 incremental DB migrations
  │   ├── schema.sql          # Full schema (standalone)
  │   ├── seed.sql            # Setup instructions
  │   └── config.toml         # Function config
  ├── vercel.json             # Vercel deployment config
  └── .env                    # Local dev only (not production)

Supabase (backend - replaceable)
  ├── Auth (user accounts)
  ├── Database (PostgreSQL)
  ├── Storage (teacher-files)
  └── Edge Functions (auto-deployed from repo)

Vercel (hosting - replaceable)
  └── Deploys from GitHub main branch
```
