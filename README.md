# NutriSync

An AI meal planner built for people who work 9-to-6, eat out too often, and feel vaguely guilty about it. You tell it your goal (lose weight, build muscle, just eat better), your diet type, your budget in rupees, and which days you actually have time to cook — and it plans the whole week for you.

It's specifically built around Indian food and Indian grocery budgets. No quinoa bowls or avocado toasts. Actual food that you can make or order in any Indian city.

---

## What it does

- Generates a weekly meal plan using Claude AI, tailored to your preferences
- Understands Indian dietary restrictions (Jain, strict veg, non-veg, vegan)
- Gives you eating-out alternatives for each meal, so you're not stranded when you can't cook
- Tracks which meals you liked/skipped and uses that feedback in next week's plan
- Generates a Sunday prep list — groceries grouped by category, prep order, total cost in ₹
- Pro plan (via Stripe) lets you regenerate the plan mid-week if you want to change things

---

## Stack

**Backend** — Node.js + Express, Supabase (Postgres + Auth), Anthropic API for meal generation

**Frontend** — React 18, Vite, Tailwind CSS, React Router

**Database** — 4 tables: `user_preferences`, `meal_plans`, `meal_feedback`, `subscriptions`, all with row-level security

---

## Running locally

You'll need Node 18+, a Supabase project, and an Anthropic API key.

**1. Clone and install**

```bash
git clone https://github.com/Rachit-XD/NutriSync.git
cd NutriSync
```

```bash
cd backend && npm install
cd ../frontend && npm install
```

**2. Set up environment variables**

Backend:
```bash
cp backend/.env.example backend/.env
```

Fill in `backend/.env`:
- `SUPABASE_URL` — from Supabase dashboard → Settings → API → Project URL
- `SUPABASE_SERVICE_KEY` — the `service_role` key (not the anon key)
- `ANTHROPIC_API_KEY` — from console.anthropic.com

Frontend:
```bash
cp frontend/.env.example frontend/.env.local
```

Fill in `frontend/.env.local`:
- `VITE_SUPABASE_URL` — same as above
- `VITE_SUPABASE_ANON_KEY` — the `anon` key this time (not service_role)
- `VITE_API_URL` — `http://localhost:3000`

**3. Set up the database**

Open your Supabase dashboard → SQL Editor → New query. Paste the contents of `supabase/migrations/001_initial_schema.sql` and run it. This creates the 4 tables and sets up RLS policies.

Also go to Authentication → Providers → Email and turn off "Confirm email" if you're testing locally — otherwise signups won't work without email verification.

**4. Start both servers**

```bash
# terminal 1
cd backend && npm run dev

# terminal 2
cd frontend && npm run dev
```

Frontend runs on `http://localhost:5173`, backend on `http://localhost:3000`.

---

## Tests

```bash
cd backend && npm test    # 15 tests
cd frontend && npm test   # 12 tests
```

---

## Project structure

```
NutriSync/
├── backend/          Express API, auth middleware, route handlers
├── frontend/         React app, Tailwind, Supabase client
├── shared/           JSDoc type definitions shared across the project
└── supabase/
    └── migrations/   SQL schema — run manually in Supabase SQL Editor
```

---

## Current status

Phase 1 is done — auth, database, and preferences API are all wired up. You can register, log in, and save your dietary preferences. The meal plan generation (Claude AI part) is coming in Phase 2.

**Roadmap:**
- [x] Phase 1 — Foundation (DB schema, backend API, auth)
- [ ] Phase 2 — AI meal plan generation with Claude
- [ ] Phase 3 — Full frontend (dashboard, onboarding, prep list page)
- [ ] Phase 4 — Stripe payments and Pro plan gating
