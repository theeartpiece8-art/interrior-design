-- MAC SPACE STUDIO — Supabase database schema
-- Paste this whole file into: Supabase Dashboard → SQL Editor → New query → Run.
-- Safe to re-run: uses IF NOT EXISTS / OR REPLACE where possible.

create extension if not exists pgcrypto;

-- ============================================================
-- 1. MESSAGES  (contact.html "Let's Talk" form)
-- ============================================================
create table if not exists public.messages (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  name        text not null,
  email       text not null,
  message     text not null
);

-- ============================================================
-- 2. NEWSLETTER  (all newsletter / signup forms)
--    UNIQUE email prevents duplicate entries at the DB level.
--    (main.js lowercases emails before sending, and its upsert
--    uses on_conflict=email, so duplicates resolve silently.)
-- ============================================================
create table if not exists public.newsletter (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  email       text not null unique
);

-- ============================================================
-- 3. ORDERS  (shop.html mock checkout — NO payment data stored)
-- ============================================================
create table if not exists public.orders (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),
  customer_name    text not null,
  email            text not null,
  phone            text,
  city             text,
  delivery_address text,
  items            jsonb not null,        -- [{id, name, price, qty}, ...]
  total            numeric not null,
  status           text not null default 'pending'
);

create index if not exists messages_created_at_idx
  on public.messages (created_at desc);

create index if not exists newsletter_created_at_idx
  on public.newsletter (created_at desc);

create index if not exists orders_created_at_idx
  on public.orders (created_at desc);

-- ============================================================
-- ROW LEVEL SECURITY
-- Visitors (anon key) may INSERT rows but can never read,
-- update or delete anything. You view submissions in the
-- Supabase dashboard (Table Editor), which uses your admin key.
-- ============================================================
alter table public.messages   enable row level security;
alter table public.newsletter enable row level security;
alter table public.orders     enable row level security;

drop policy if exists "public insert" on public.messages;
create policy "public insert" on public.messages
  for insert to anon with check (true);

drop policy if exists "public insert" on public.newsletter;
create policy "public insert" on public.newsletter
  for insert to anon with check (true);

drop policy if exists "public insert" on public.orders;
create policy "public insert" on public.orders
  for insert to anon with check (true);
