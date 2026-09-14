-- ============================================================
-- WORLD OF BANDS FLORIDA — Portal schema (school → bands)
-- Run once in Supabase: Dashboard → SQL Editor → New query → Run.
--
-- One SCHOOL row per paying school (the coach's page, signs once).
-- One BAND row per band under that school (the kids' page).
-- RLS is ON with NO policies: the public anon key can read nothing.
-- Only the Netlify Functions (service_role key, server-side) touch this.
-- ============================================================

create extension if not exists pgcrypto;

create or replace function public.wob_token() returns text
language sql volatile as $$
  select substr(encode(gen_random_bytes(16), 'hex'), 1, 20)
$$;

-- ---------- schools ----------
create table if not exists public.schools (
  id                uuid primary key default gen_random_uuid(),
  token             text unique not null default public.wob_token(),
  school_name       text not null,

  -- who's who at the school
  coordinator_name  text,   -- Director of Performance & Events: holds this link, signs
  coordinator_phone text,
  coordinator_email text,
  contact_name      text,   -- official school contact: owner / principal / office
  contact_role      text,
  contact_phone     text,
  contact_email     text,

  emergency_name    text,
  emergency_phone   text,
  expected_guests   text,
  accessibility_notes text,

  -- permissions, signed once for every band under this school
  release_media     boolean not null default false,
  release_logo      boolean not null default false,
  release_minors    boolean not null default false,
  release_clean     boolean not null default false,
  release_signed_by text,
  release_role      text,
  release_signed_at timestamptz,
  release_ip        text,

  status            text not null default 'open',   -- open | submitted | locked
  submitted_at      timestamptz,
  admin_notes       text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index if not exists schools_token_idx on public.schools (token);

-- ---------- bands ----------
create table if not exists public.bands (
  id            uuid primary key default gen_random_uuid(),
  token         text unique not null default public.wob_token(),
  school_id     uuid not null references public.schools(id) on delete cascade,
  band_name     text not null default '',
  slot_number   int,

  bio_en        text,
  hook_line     text,
  hometown      text,
  formed_year   text,
  instagram     text,

  -- band coach: sometimes the school coordinator, sometimes not
  coach_name    text,
  coach_phone   text,
  coach_email   text,

  members       jsonb not null default '[]'::jsonb,  -- [{name,instrument,instrument_other,age}]
  songs         jsonb not null default '[]'::jsonb,  -- [{round,title,artist,duration}]
  tech_notes    text,

  -- shirt pre-order: {"YS":2,"M":5} at $25 each, invoiced to the school
  merch_sizes   jsonb not null default '{}'::jsonb,
  merch_notes   text,

  admin_notes   text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists bands_token_idx on public.bands (token);
create index if not exists bands_school_idx on public.bands (school_id);

-- ---------- uploaded files (owned by a band OR a school) ----------
create table if not exists public.assets (
  id          uuid primary key default gen_random_uuid(),
  band_id     uuid references public.bands(id) on delete cascade,
  school_id   uuid references public.schools(id) on delete cascade,
  kind        text not null,   -- logo | band_photo | press_photo | stage_plot | school_logo
  path        text not null,   -- object path inside the band-assets bucket
  filename    text,
  mime        text,
  size_bytes  bigint,
  created_at  timestamptz not null default now(),
  check (num_nonnulls(band_id, school_id) = 1)
);
create index if not exists assets_band_idx on public.assets (band_id);
create index if not exists assets_school_idx on public.assets (school_id);

-- ---------- extras interest ----------
create table if not exists public.addons (
  id          uuid primary key default gen_random_uuid(),
  band_id     uuid references public.bands(id) on delete cascade,
  school_id   uuid references public.schools(id) on delete cascade,
  addon       text not null,   -- photo_pack (band) | raffle | sponsor (school)
  note        text,
  created_at  timestamptz not null default now()
);

-- ---------- updated_at ----------
create or replace function public.wob_touch() returns trigger
language plpgsql as $$ begin new.updated_at = now(); return new; end $$;
drop trigger if exists schools_touch on public.schools;
create trigger schools_touch before update on public.schools for each row execute function public.wob_touch();
drop trigger if exists bands_touch on public.bands;
create trigger bands_touch before update on public.bands for each row execute function public.wob_touch();

-- ---------- lock down ----------
alter table public.schools enable row level security;
alter table public.bands   enable row level security;
alter table public.assets  enable row level security;
alter table public.addons  enable row level security;
-- (deliberately no policies)

-- Create schools and their bands from /admin — it generates the links for you.
