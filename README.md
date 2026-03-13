# HealthTrack — AI Diet & Fitness Web App

Track daily meals and workouts with AI-powered calorie analysis, personalized plans, and coaching feedback.

## Tech Stack
- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS
- **Auth & Database**: Supabase (email auth + PostgreSQL + RLS)
- **AI**: Swappable — Claude Haiku (default), Gemini 1.5 Flash (free), or GPT-4o mini
- **Deploy**: Vercel (free hobby plan)

---

## Setup — 5 steps

### 1. Install dependencies
```bash
npm install
```

### 2. Set up Supabase

1. Open your Supabase project (or create one at supabase.com)
2. Go to **SQL Editor** and run the full contents of `supabase-schema.sql`
   - This creates all 4 tables with proper auth linkage and Row Level Security
   - No personal data is in this file — safe to commit to GitHub
3. Go to **Authentication → Providers → Email** and confirm it's enabled
   - Optional: disable "Confirm email" under Auth settings for easier local dev

### 3. Configure environment variables
```bash
cp .env.local.example .env.local
```
Fill in `.env.local` — see the comments inside for exactly where to find each value in Supabase.

### 4. Run locally
```bash
npm run dev
```
Open http://localhost:3000 — you'll be redirected to `/login` to create an account.

### 5. Deploy to Vercel
```bash
# Push to GitHub first (your .gitignore protects .env.local automatically)
git init && git add . && git commit -m "init"
git remote add origin https://github.com/you/health-tracker.git
git push -u origin main

# Then connect repo at vercel.com → New Project → import from GitHub
# Add your env vars in Vercel's project settings → Environment Variables
```

After deploying, add your Vercel URL to Supabase:
- **Authentication → URL Configuration → Site URL** → set to your Vercel URL
- **Authentication → URL Configuration → Redirect URLs** → add `https://your-app.vercel.app/**`

---

## How it works

### Auth flow
- `/login` — sign up or sign in with email + password
- On signup, Supabase automatically creates an empty profile row via a database trigger
- `/profile` — fill in your details; smart edit page (never re-onboards existing users)
- All data is tied to your auth user ID, enforced by Row Level Security at the database level

### Pages
| Page | Description |
|---|---|
| `/dashboard` | Calorie ring, macros, AI daily plan + feedback |
| `/log` | Add food by typing naturally → AI analyzes calories & macros |
| `/calendar` | Monthly view, click any day for details, weight trend chart |
| `/profile` | Edit your goal, stats, diet & workout preferences |

### Switching AI provider
In `.env.local`, set `AI_PROVIDER` to one of:
- `anthropic` — Claude Haiku 4.5 (best quality, ~$0.01/day personal use)
- `gemini` — Gemini 1.5 Flash (free up to generous daily limits)
- `openai` — GPT-4o mini (~$0.02/day)

### Multi-user
The app is fully multi-user — each account sees only its own data, enforced by Supabase Row Level Security. Share the deployed URL and anyone can create their own account.

---

## Project structure
```
src/
  app/
    api/ai/       ← AI route: food analysis, plan generation, feedback
    dashboard/    ← Home with calorie ring and AI plan
    log/          ← Daily food + workout logging
    calendar/     ← Monthly calendar + weight chart
    login/        ← Email auth (sign in / sign up)
    profile/      ← Edit profile (smart: loads existing data)
    nav.tsx       ← Auth-aware navigation bar
  lib/
    supabase.ts       ← Supabase client + DB types
    ai.ts             ← AI provider abstraction (Claude/Gemini/OpenAI)
    auth-context.tsx  ← React auth context (useAuth hook)
supabase-schema.sql   ← Run once in Supabase SQL editor — no personal data
.env.local.example    ← Copy to .env.local and fill in your keys
```
