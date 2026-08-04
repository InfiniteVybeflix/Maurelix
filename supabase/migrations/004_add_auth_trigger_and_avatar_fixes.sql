-- ═══════════════════════════════════════════════════════════════════════════════
-- Migration 004: Add Missing Auth Trigger + Onboarding Resilience Fixes
-- Applied: 2026-08-04
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- WHAT WAS MISSING FROM MIGRATIONS 001–003:
--   • The on_auth_user_created trigger on auth.users was NEVER created.
--   • Without this trigger, signing up via Supabase Auth creates an auth.users
--     row but NO corresponding profiles row.
--   • This caused EVERY profile UPDATE in onboarding to fail silently:
--       – display_name, love_language, ai_name (via syncToDb debounce)
--       – avatar_url (via handleAvatarUpload)
--       – partner_id + onboarding_completed (via verifyPairingCode)
--       – onboarding_completed (via completePairing)
--   • The avatar upload also had zero error handling, so failures were invisible.
--
-- WHAT THIS MIGRATION DOES:
--   1. Creates the handle_new_user() function (security definer)
--   2. Attaches it as a trigger on auth.users AFTER INSERT
--   3. Backfills any existing auth.users who are missing a profile row
--   4. All operations are idempotent — safe to re-run.
--
-- FRONTEND FIXES (in app/onboarding/page.tsx):
--   • syncToDb now uses UPSERT instead of UPDATE (guarantees row creation)
--   • handleAvatarUpload now shows clear error messages for:
--       – Missing 'avatars' storage bucket
--       – File too large (>5MB)
--       – Invalid file type
--       – Upload failures
--   • Avatar upload shows a loading spinner overlay
--   • File input is reset after upload so the same file can be retried
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Create / replace the trigger function
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'display_name',
      new.raw_user_meta_data ->> 'full_name',
      split_part(new.email, '@', 1),
      'Maurelix User'
    )
  );
  return new;
exception
  when unique_violation then
    -- Profile already exists (e.g., re-running migration), ignore
    return new;
end;
$$;

-- 2. Drop + recreate the trigger (idempotent)
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3. Backfill: create profile rows for any existing auth.users who lack one
--    This fixes users who signed up BEFORE this migration was applied.
insert into public.profiles (id, display_name)
select
  au.id,
  coalesce(
    au.raw_user_meta_data ->> 'display_name',
    au.raw_user_meta_data ->> 'full_name',
    split_part(au.email, '@', 1),
    'Maurelix User'
  )
from auth.users au
left join public.profiles p on p.id = au.id
where p.id is null
on conflict (id) do nothing;
