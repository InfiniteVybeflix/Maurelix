-- Migration 003: Fix RLS for pairing code generation + add missing policies
-- Applied: 2026-08-04
-- NOTE: If you initialized your DB from schema.sql (which now includes these),
-- this migration is idempotent and safe to re-run.

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. RLS POLICY — Allow authenticated users to INSERT their own couple record
--    This was MISSING in the original 001 schema. Without it, createPairingCode()
--    fails with a silent RLS violation (returns null, no error shown to user).
-- ═══════════════════════════════════════════════════════════════════════════════

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'couples'
      and policyname = 'Users can create couples'
  ) then
    create policy "Users can create couples"
      on couples for insert
      with check (auth.uid() = user_a_id);
  end if;
end $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. RLS POLICY — Allow user_a to update their pending couple (re-generate codes)
--    The original "Couple members can update" requires user_b to exist.
--    Before pairing, user_b is null, so updates were blocked.
-- ═══════════════════════════════════════════════════════════════════════════════

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'couples'
      and policyname = 'User A can update pending couple'
  ) then
    create policy "User A can update pending couple"
      on couples for update
      using (auth.uid() = user_a_id);
  end if;
end $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. RLS POLICY — Allow user_b to update an active couple they joined
--    Needed for leaving a relationship, updating encryption keys, etc.
-- ═══════════════════════════════════════════════════════════════════════════════

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'couples'
      and policyname = 'User B can update active couple'
  ) then
    create policy "User B can update active couple"
      on couples for update
      using (auth.uid() = user_b_id);
  end if;
end $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. INDEX — Speed up pairing code lookups (critical for verifyPairingCode)
-- ═══════════════════════════════════════════════════════════════════════════════

create index if not exists idx_couples_pairing_code_pending
  on couples(pairing_code) where status = 'pending';
