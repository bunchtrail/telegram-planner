Supabase setup

1) Apply schema
   - Run the SQL from `supabase/schema.sql` in the Supabase SQL editor.

2) Environment variables
   - `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` (для server-side jobs, например reminders runner)
   - `SUPABASE_JWT_SECRET` (same value as in your Supabase project settings)
   - `TELEGRAM_BOT_TOKEN`
   - `REMINDERS_RUN_SECRET` (секрет для `POST /api/reminders/run`)
   - Optional for local dev: `NEXT_PUBLIC_TELEGRAM_INIT_DATA`

3) JWT + RLS
   - Policies rely on the `telegram_id` claim.
   - The API route signs a JWT with `telegram_id` and `sub`.
