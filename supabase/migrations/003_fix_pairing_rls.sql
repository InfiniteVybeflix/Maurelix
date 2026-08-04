-- Migration 003: Fix RLS for pairing code generation
-- Applied: 2026-08-04

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. RLS POLICY — Allow authenticated users to INSERT their own couple record
--    This was MISSING in 001. Without it, generatePairingCode() fails silently.
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
--    001 only had "Couple members can update" which requires user_b to exist.
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
