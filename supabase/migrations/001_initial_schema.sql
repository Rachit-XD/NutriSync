-- NutriSync initial schema
-- Run this in the Supabase SQL editor: Dashboard > SQL Editor > New query
-- This script is idempotent: safe to run multiple times.

-- ============================================================
-- TABLES
-- ============================================================

create table if not exists user_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  goal text not null check (goal in ('lose_weight', 'muscle_gain', 'maintain', 'eat_healthy')),
  diet_type text not null check (diet_type in ('veg', 'vegan', 'jain', 'non_veg')),
  spice_level text not null check (spice_level in ('mild', 'medium', 'spicy')),
  cooking_days text[] not null default '{}',
  daily_budget_inr integer not null,
  kitchen_gear text[] not null default '{}',
  allergies text,
  updated_at timestamptz not null default now(),
  unique(user_id)
);

create table if not exists meal_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  week_start_date date not null,
  plan_json jsonb not null,
  generation_cost_tokens integer,
  created_at timestamptz not null default now(),
  unique(user_id, week_start_date)
);

create table if not exists meal_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  meal_plan_id uuid not null references meal_plans(id) on delete cascade,
  day_of_week text not null,
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  rating text check (rating in ('thumbs_up', 'thumbs_down')),
  skipped boolean not null default false,
  created_at timestamptz not null default now(),
  check (day_of_week in ('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday')),
  check (skipped = true or rating is not null)
);

create table if not exists subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  stripe_customer_id text,
  stripe_subscription_id text,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  status text,
  current_period_end timestamptz,
  created_at timestamptz not null default now(),
  unique(user_id)
  -- NOTE: subscriptions is written exclusively by the Stripe webhook handler
  -- using the service-role key (which bypasses RLS). Only a SELECT policy
  -- is granted to authenticated users so they can read their own tier.
  -- Do NOT add INSERT/UPDATE/DELETE policies here — that would allow
  -- users to self-upgrade their plan from the client.
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- user_preferences
alter table user_preferences enable row level security;

drop policy if exists "users_select_own_preferences" on user_preferences;
create policy "users_select_own_preferences"
  on user_preferences for select
  using (auth.uid() = user_id);

drop policy if exists "users_insert_own_preferences" on user_preferences;
create policy "users_insert_own_preferences"
  on user_preferences for insert
  with check (auth.uid() = user_id);

drop policy if exists "users_update_own_preferences" on user_preferences;
create policy "users_update_own_preferences"
  on user_preferences for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "users_delete_own_preferences" on user_preferences;
create policy "users_delete_own_preferences"
  on user_preferences for delete
  using (auth.uid() = user_id);

-- meal_plans
alter table meal_plans enable row level security;

drop policy if exists "users_select_own_meal_plans" on meal_plans;
create policy "users_select_own_meal_plans"
  on meal_plans for select
  using (auth.uid() = user_id);

drop policy if exists "users_insert_own_meal_plans" on meal_plans;
create policy "users_insert_own_meal_plans"
  on meal_plans for insert
  with check (auth.uid() = user_id);

drop policy if exists "users_update_own_meal_plans" on meal_plans;
create policy "users_update_own_meal_plans"
  on meal_plans for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "users_delete_own_meal_plans" on meal_plans;
create policy "users_delete_own_meal_plans"
  on meal_plans for delete
  using (auth.uid() = user_id);

-- meal_feedback
alter table meal_feedback enable row level security;

drop policy if exists "users_select_own_feedback" on meal_feedback;
create policy "users_select_own_feedback"
  on meal_feedback for select
  using (auth.uid() = user_id);

drop policy if exists "users_insert_own_feedback" on meal_feedback;
create policy "users_insert_own_feedback"
  on meal_feedback for insert
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from meal_plans
      where meal_plans.id = meal_plan_id
        and meal_plans.user_id = auth.uid()
    )
  );

drop policy if exists "users_update_own_feedback" on meal_feedback;
create policy "users_update_own_feedback"
  on meal_feedback for update
  using (auth.uid() = user_id)
  with check (
    auth.uid() = user_id
    and exists (
      select 1 from meal_plans
      where meal_plans.id = meal_plan_id
        and meal_plans.user_id = auth.uid()
    )
  );

drop policy if exists "users_delete_own_feedback" on meal_feedback;
create policy "users_delete_own_feedback"
  on meal_feedback for delete
  using (auth.uid() = user_id);

-- subscriptions (read-only for authenticated users; writes go through service-role key)
alter table subscriptions enable row level security;

drop policy if exists "users_select_own_subscription" on subscriptions;
create policy "users_select_own_subscription"
  on subscriptions for select
  using (auth.uid() = user_id);

-- ============================================================
-- INDEXES
-- ============================================================

create index if not exists meal_plans_user_id_idx on meal_plans (user_id);
create index if not exists meal_feedback_user_id_idx on meal_feedback (user_id);
create index if not exists meal_feedback_meal_plan_id_idx on meal_feedback (meal_plan_id);
