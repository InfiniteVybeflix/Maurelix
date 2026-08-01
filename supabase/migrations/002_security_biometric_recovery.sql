-- Migration 002: Security Questions, PIN Recovery, Biometric Auth, Admin RLS
-- Applied: 2026-08-01

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. PROFILES — Security Questions & PIN Recovery
--    Stores 2 security questions + hashed answers + a recovery-encrypted
--    copy of the user's private key (encrypted with the answers).
-- ═══════════════════════════════════════════════════════════════════════════════

alter table profiles
  add column if not exists security_question_1 text,
  add column if not exists security_answer_1_hash text,
  add column if not exists security_question_2 text,
  add column if not exists security_answer_2_hash text,
  add column if not exists recovery_encrypted_private_key text,
  add column if not exists recovery_salt text;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. PROFILES — Biometric Authentication (WebAuthn / Fingerprint)
-- ═══════════════════════════════════════════════════════════════════════════════

alter table profiles
  add column if not exists biometric_enabled boolean default false,
  add column if not exists biometric_credential_id text;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. COUPLES — Pairing completion timestamp
--    Set when user_b joins via pairing code.
-- ═══════════════════════════════════════════════════════════════════════════════

alter table couples
  add column if not exists paired_at timestamptz;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. INDEXES — Optimize queries on new columns
-- ═══════════════════════════════════════════════════════════════════════════════

create index if not exists idx_couples_paired_at on couples(paired_at) where paired_at is not null;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. RLS POLICY FIX — Admin can read ALL profiles
--    001 only had "Users read own profile" and "Users read partner profile".
--    An admin visiting /admin needs to see ALL user profiles.
-- ═══════════════════════════════════════════════════════════════════════════════

create policy if not exists "Admin read all profiles"
  on profiles for select
  using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

-- ═══════════════════════════════════════════════════════════════════════════════
-- 6. RLS POLICY FIX — Admin can read ALL couples
--    001 only had "Couple members can read". Admin needs full visibility.
-- ═══════════════════════════════════════════════════════════════════════════════

create policy if not exists "Admin read all couples"
  on couples for select
  using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

-- ═══════════════════════════════════════════════════════════════════════════════
-- 7. RLS POLICY FIX — Admin can read ALL device_keys
--    001 only had "Own keys only". Admin dashboard may need this.
-- ═══════════════════════════════════════════════════════════════════════════════

create policy if not exists "Admin read all device_keys"
  on device_keys for select
  using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

-- ═══════════════════════════════════════════════════════════════════════════════
-- 8. RLS POLICY FIX — Admin can read ALL messages
--    001 had no admin policy on messages.
-- ═══════════════════════════════════════════════════════════════════════════════

create policy if not exists "Admin read all messages"
  on messages for select
  using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );
