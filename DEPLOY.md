# BuildFeed — Deploy Guide

## מה מוכן
- ✅ Supabase DB (project: `jmlasthxrnjecedsacme`, eu-central-1)
- ✅ Supabase Storage buckets: `slides-images`, `slides-audio`
- ✅ Cloudflare R2 bucket: `buildfeed-media`
- ✅ כל הטבלאות + RLS + triggers
- ✅ Seed data — 3 פוסטים לדוגמה

---

## שלב 1 — GitHub OAuth (5 דקות)

1. נכנס ל-[github.com/settings/developers](https://github.com/settings/developers)
2. **New OAuth App**:
   - Homepage URL: `http://localhost:3000` (לפיתוח) / `https://buildfeed.app` (לייצור)
   - Authorization callback URL: `https://jmlasthxrnjecedsacme.supabase.co/auth/v1/callback`
3. העתק **Client ID** ו-**Client Secret**
4. נכנס ל-[supabase.com/dashboard/project/jmlasthxrnjecedsacme/auth/providers](https://supabase.com/dashboard/project/jmlasthxrnjecedsacme/auth/providers)
5. פתח **GitHub** → הדבק Client ID + Secret → Save

## שלב 2 — Google OAuth (אופציונלי)

1. נכנס ל-[console.cloud.google.com](https://console.cloud.google.com) → APIs & Services → Credentials
2. Create OAuth 2.0 Client ID (Web application)
   - Authorized redirect URI: `https://jmlasthxrnjecedsacme.supabase.co/auth/v1/callback`
3. הדבק ב-Supabase → Auth → Providers → Google

## שלב 3 — Supabase Auth URL Config

נכנס ל-[supabase.com/dashboard/project/jmlasthxrnjecedsacme/auth/url-configuration](https://supabase.com/dashboard/project/jmlasthxrnjecedsacme/auth/url-configuration):
- **Site URL**: `http://localhost:3000` (פיתוח) / `https://buildfeed.pages.dev` (ייצור)
- **Redirect URLs** (הוסף את שניהם):
  - `http://localhost:3000/auth/callback`
  - `https://buildfeed.pages.dev/auth/callback`

---

## שלב 4 — הרצה מקומית

```bash
# 1. פרוס את הקבצים
tar -xzf buildfeed-source.tar.gz
cp env.local.txt .env.local

# 2. התקן dependencies
npm install

# 3. הרץ
npm run dev
# → http://localhost:3000
```

---

## שלב 5 — Deploy ל-Cloudflare Pages

### אפשרות א׳ — מה-CLI (מומלץ):
```bash
# 1. התחבר ל-Cloudflare
npx wrangler login

# 2. בנה ופרוס
npm run deploy
```

### אפשרות ב׳ — מה-Dashboard:
1. נכנס ל-[dash.cloudflare.com](https://dash.cloudflare.com) → Workers & Pages
2. Create application → Pages → Connect to Git
3. בחר את ה-repo של BuildFeed
4. Build settings:
   - **Framework**: Next.js
   - **Build command**: `npx @cloudflare/next-on-pages`
   - **Build output directory**: `.vercel/output/static`
5. Environment variables — הוסף:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://jmlasthxrnjecedsacme.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

---

## env.local מלא

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://jmlasthxrnjecedsacme.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImptbGFzdGh4cm5qZWNlZHNhY21lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NTI1NTUsImV4cCI6MjA4OTQyODU1NX0.IGJDy4QXA4f6ry1zJHfIZKhvsvW91ZSyJcERukZO1XI

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_STORAGE_URL=https://jmlasthxrnjecedsacme.supabase.co/storage/v1
```

---

## מבנה הפרויקט

```
buildfeed/
├── app/
│   ├── page.tsx              ← פיד ראשי (Supabase connected)
│   ├── post/[id]/            ← צפייה בפוסט
│   ├── creator/[username]/   ← פרופיל יוצר
│   ├── product/[id]/         ← עמוד מוצר
│   ├── login/                ← GitHub + Google OAuth
│   ├── auth/callback/        ← OAuth redirect
│   └── studio/               ← ממשק יצירה
│       ├── page.tsx          ← רשימת פוסטים
│       ├── new/              ← פוסט חדש
│       └── post/[id]/edit/   ← עריכת פוסט
├── components/
│   ├── player/               ← SlidePlayer, SlideView, CodeSlide
│   ├── feed/                 ← PostCard, CategoryFilter
│   └── studio/               ← AudioRecorder, DragDropUpload, SlideEditor
└── lib/
    ├── types.ts              ← כל ה-TypeScript types
    ├── seed.ts               ← נתוני demo
    ├── data.ts               ← Supabase queries
    └── r2/upload.ts          ← Supabase Storage upload
```

---

## Supabase Dashboard links

- **DB**: [supabase.com/dashboard/project/jmlasthxrnjecedsacme](https://supabase.com/dashboard/project/jmlasthxrnjecedsacme)
- **Auth**: [.../auth/providers](https://supabase.com/dashboard/project/jmlasthxrnjecedsacme/auth/providers)
- **Storage**: [.../storage/buckets](https://supabase.com/dashboard/project/jmlasthxrnjecedsacme/storage/buckets)
- **Edge Functions**: [.../functions](https://supabase.com/dashboard/project/jmlasthxrnjecedsacme/functions)
