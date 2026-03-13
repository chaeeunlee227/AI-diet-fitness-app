# HealthTrack — AI Diet & Fitness Web App

A personal web app to track daily diet and workouts with AI-powered calorie analysis and suggestions.

## Tech Stack
- **Frontend**: Next.js 14 + TypeScript + Tailwind CSS
- **Database**: Supabase (PostgreSQL)
- **AI**: Swappable — Claude Haiku (default), Gemini 1.5 Flash (free), or GPT-4o mini

---

## Setup in 5 steps

### 1. Install dependencies
```bash
npm install
```

### 2. Set up Supabase
1. Go to [supabase.com](https://supabase.com) and open your project (or create one)
2. Open **SQL Editor** and paste the contents of `supabase-schema.sql`
3. Click **Run** — this creates all 4 tables and inserts your default profile
4. Edit the `INSERT INTO profiles` values to match your height, weight, age, and goal

### 3. Configure environment variables
```bash
cp .env.local.example .env.local
```
Edit `.env.local`:
- Add your **Supabase URL** and **anon key** (from Supabase > Settings > API)
- Add your AI API key (choose one):
  - `ANTHROPIC_API_KEY` + `AI_PROVIDER=anthropic` ← recommended while learning
  - `GEMINI_API_KEY` + `AI_PROVIDER=gemini` ← free tier, great for personal use
  - `OPENAI_API_KEY` + `AI_PROVIDER=openai`

### 4. Run the app
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

### 5. Deploy (optional)
```bash
# Deploy to Vercel (free)
npx vercel
```

---

## Features

| Feature | Description |
|---|---|
| **Dashboard** | Daily overview — calorie ring, macros, AI-suggested meal plan & workout |
| **Daily Log** | Add food by typing naturally → AI analyzes calories & macros instantly |
| **Workout Log** | Log workouts with duration, type, calories burned |
| **Calendar** | Monthly view with logged days highlighted, click any day for details |
| **Weight trend** | Chart of weight over time (log weights in the `weight_logs` table) |
| **AI feedback** | Personalized daily coaching message based on your logs |

## Switching AI Provider

In `.env.local`, change `AI_PROVIDER` to one of:
- `anthropic` — Claude Haiku 4.5 (~$0.01/day personal use)
- `gemini` — Gemini 1.5 Flash (free up to generous daily limits)
- `openai` — GPT-4o mini (~$0.02/day personal use)

## Project Structure
```
src/
  app/
    api/ai/       ← AI route (food analysis, plan generation, feedback)
    dashboard/    ← Home overview page
    log/          ← Daily food + workout logging
    calendar/     ← Monthly calendar view
  lib/
    supabase.ts   ← Supabase client + types
    ai.ts         ← AI provider abstraction
```
