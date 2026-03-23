-- ============================================================
-- The Creator Podium — Supabase Schema
-- ============================================================
-- BIDDING WAR RULES (enforced in application logic + DB constraints):
--   1. Each creator has exactly 10 podium spots (positions 1–10).
--   2. Position 1 is the most prestigious (and most expensive) spot.
--   3. To claim a spot you must pay MORE than the current holder's amount_paid.
--   4. The displaced fan loses their spot with NO REFUND.
--   5. Messages are pre-moderated via OpenAI before any record is inserted.
-- ============================================================

-- Enable UUID generation
create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- creators
-- Stores one row per creator who signs up for The Creator Podium.
-- Each creator brings their own Stripe keys so payouts are direct.
-- ------------------------------------------------------------
create table if not exists creators (
  id                    uuid primary key default gen_random_uuid(),
  slug                  text unique not null,          -- used in URL: /<slug>
  stripe_secret_key     text not null,                 -- creator's Stripe secret key
  stripe_webhook_secret text not null,                 -- per-creator webhook signing secret
  created_at            timestamptz not null default now()
);

-- Index for fast slug lookups (public podium page route)
create index if not exists creators_slug_idx on creators (slug);

-- ------------------------------------------------------------
-- podium_spots
-- Stores the CURRENT occupant of each position for each creator.
-- Only one row per (creator_id, position) pair at any time.
-- When a fan outbids another, the old row is replaced (UPDATE),
-- and a refund is NOT issued to the displaced fan.
-- ------------------------------------------------------------
create table if not exists podium_spots (
  id                        uuid primary key default gen_random_uuid(),
  creator_id                uuid not null references creators(id) on delete cascade,

  -- Position 1–10. 1–3 = podium display, 4–10 = leaderboard.
  position                  smallint not null check (position between 1 and 10),

  fan_handle                text not null,             -- e.g. "@alice"
  fan_avatar_url            text,                      -- optional profile picture URL
  message                   text,                      -- optional shoutout, pre-moderated
  amount_paid               integer not null,           -- in cents (USD)
  stripe_payment_intent_id  text not null unique,      -- for audit / dispute resolution

  created_at                timestamptz not null default now(),

  -- Enforce one occupant per position per creator at all times
  unique (creator_id, position)
);

-- Index for fast leaderboard queries (order by position)
create index if not exists podium_spots_creator_position_idx
  on podium_spots (creator_id, position asc);

-- ------------------------------------------------------------
-- Row-Level Security
-- Public can read podium spots (leaderboard is public).
-- Only service-role (API routes) can insert/update/delete.
-- ------------------------------------------------------------
alter table creators enable row level security;
alter table podium_spots enable row level security;

-- Public read access for podium spots
create policy "Public can read podium spots"
  on podium_spots for select
  using (true);

-- Service role has full access (bypasses RLS by default)
-- No additional policies needed for service role.
