-- =========================================
-- HealthTrack — Supabase Schema (Multi-user + Auth)
-- Run this in: Supabase Dashboard > SQL Editor
-- Safe to commit to GitHub — no personal data here
-- =========================================

-- 1. Profiles table — linked to Supabase Auth users
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
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

-- 2. Food logs
create table if not exists food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
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

-- 3. Workout logs
create table if not exists workout_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null default current_date,
  workout_type text not null,
  duration_minutes integer not null,
  calories_burned integer,
  notes text,
  created_at timestamptz default now()
);
create index if not exists workout_logs_date_idx on workout_logs(user_id, log_date);

-- 4. Weight logs
create table if not exists weight_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  log_date date not null default current_date,
  weight_kg numeric not null,
  created_at timestamptz default now(),
  unique(user_id, log_date)
);

-- =========================================
-- Row Level Security — each user sees only their own data
-- =========================================
alter table profiles enable row level security;
alter table food_logs enable row level security;
alter table workout_logs enable row level security;
alter table weight_logs enable row level security;

create policy "profiles: own row" on profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "food_logs: own rows" on food_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "workout_logs: own rows" on workout_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

create policy "weight_logs: own rows" on weight_logs
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- =========================================
-- Auto-create an empty profile row on signup
-- =========================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id)
  values (new.id)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
