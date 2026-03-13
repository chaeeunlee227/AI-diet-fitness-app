-- =========================================
-- HealthTrack — Supabase Schema
-- Run this in: Supabase Dashboard > SQL Editor
-- =========================================

-- 1. User profile table
create table if not exists profiles (
  id text primary key default 'personal-user',
  goal text not null default 'lose_weight',
  goal_due_date date,
  height_cm numeric,
  weight_kg numeric,
  age integer,
  sex text,
  activity_level text default 'lightly_active',
  diet_preferences text[] default '{}',
  workout_preferences text[] default '{}',
  daily_calorie_target integer default 2000,
  daily_protein_target integer default 150,
  created_at timestamptz default now()
);

-- Insert default profile (edit values to match you!)
insert into profiles (id, goal, height_cm, weight_kg, age, sex, activity_level, daily_calorie_target, daily_protein_target)
values ('personal-user', 'lose_weight', 175, 75, 28, 'male', 'lightly_active', 1800, 140)
on conflict (id) do nothing;

-- 2. Food logs table
create table if not exists food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'personal-user',
  log_date date not null default current_date,
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  food_name text not null,
  quantity_g numeric,
  calories integer not null,
  protein_g numeric,
  carbs_g numeric,
  fat_g numeric,
  notes text,
  created_at timestamptz default now()
);

create index if not exists food_logs_date_idx on food_logs(user_id, log_date);

-- 3. Workout logs table
create table if not exists workout_logs (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'personal-user',
  log_date date not null default current_date,
  workout_type text not null,
  duration_minutes integer not null,
  calories_burned integer,
  notes text,
  created_at timestamptz default now()
);

create index if not exists workout_logs_date_idx on workout_logs(user_id, log_date);

-- 4. Weight logs table
create table if not exists weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id text not null default 'personal-user',
  log_date date not null default current_date,
  weight_kg numeric not null,
  created_at timestamptz default now(),
  unique(user_id, log_date)
);

-- 5. Row Level Security (disable for personal use, or enable if adding auth later)
-- For personal use with a fixed user_id, RLS is optional.
-- To disable RLS on all tables (simplest for personal use):
alter table profiles disable row level security;
alter table food_logs disable row level security;
alter table workout_logs disable row level security;
alter table weight_logs disable row level security;
