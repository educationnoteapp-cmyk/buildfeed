# Google Auth Setup — Creator Podium

Follow these steps exactly. Takes ~10 minutes.

---

## 1. Enable Google Provider in Supabase Dashboard

1. Open your Supabase project → **Authentication → Providers → Google**
2. Toggle **Enable** to ON
3. Paste your **Google Client ID** and **Google Client Secret** (get them in step 2 below)
4. Copy the **Callback URL** shown on this page — you'll need it in step 2:
   ```
   https://[your-project-ref].supabase.co/auth/v1/callback
   ```
5. Click **Save**

---

## 2. Get Google Client ID + Secret from Google Cloud Console

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project (or select an existing one)
3. Navigate to **APIs & Services → Credentials**
4. Click **+ Create Credentials → OAuth Client ID**
5. Application type: **Web application**
6. Under **Authorised redirect URIs** add:
   ```
   https://[your-project-ref].supabase.co/auth/v1/callback
   ```
   > Replace `[your-project-ref]` with your actual Supabase project ref
7. Click **Create** — copy the **Client ID** and **Client Secret**
8. Paste both into the Supabase Google Provider form (step 1)

---

## 3. Configure Consent Screen (required by Google)

1. In Google Cloud Console → **APIs & Services → OAuth consent screen**
2. User Type: **External**
3. Fill in:
   - **App name**: Creator Podium
   - **User support email**: your email
   - **Developer contact email**: your email
4. Scopes: add `email` and `profile`
5. Save and **Publish** the app (click "Publish App" to exit testing mode)

---

## 4. Add Environment Variables to `.env.local`

```bash
# Supabase (public — safe for browser)
NEXT_PUBLIC_SUPABASE_URL=https://[your-project-ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...  # from Project Settings → API

# Supabase service role (server-only — NEVER expose to browser)
SUPABASE_SERVICE_ROLE_KEY=eyJ...  # from Project Settings → API → service_role
```

> **How to find these:**
> Supabase Dashboard → Project Settings → API → Project URL + Project API keys

---

## 5. Apply the Auth Schema Migration

Run this in **Supabase Dashboard → SQL Editor** (or `supabase db push`):

```sql
-- Add auth user link to creators table
ALTER TABLE creators
  ADD COLUMN IF NOT EXISTS auth_user_id UUID REFERENCES auth.users(id);

CREATE UNIQUE INDEX IF NOT EXISTS creators_auth_user_id_idx
  ON creators(auth_user_id);
```

---

## 6. Verify the Flow

1. Start the dev server: `npm run dev`
2. Visit `http://localhost:3000/login`
3. Click "Continue with Google" — you should be redirected to Google's sign-in
4. After sign-in you should land on `/dashboard`
5. Check Supabase Dashboard → Authentication → Users — your user should appear

---

## Troubleshooting

| Problem | Fix |
|---|---|
| Redirect URI mismatch | Ensure the URI in Google Console exactly matches Supabase's callback URL |
| "Access blocked" on consent | Publish your OAuth consent screen (exit test mode) |
| Still on `/login` after Google sign-in | Check `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` in `.env.local` |
| 403 on `/dashboard` | Make sure RLS policies are applied (step 5) |
