-- Enable extensions
create extension if not exists "uuid-ossp";

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. PROFILES
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_url text,
  is_admin boolean default false,
  partner_id uuid references profiles(id),
  ai_name text default 'Syne',
  theme_color text default '#FF6B8A',
  wallpaper_url text,
  onboarding_completed boolean default false,
  love_language text check (love_language in ('words', 'acts', 'gifts', 'time', 'touch')),
  -- Security & biometric (added in migration 002, included here for fresh installs)
  security_question_1 text,
  security_answer_1_hash text,
  security_question_2 text,
  security_answer_2_hash text,
  recovery_encrypted_private_key text,
  recovery_salt text,
  biometric_enabled boolean default false,
  biometric_credential_id text,
  created_at timestamptz default now()
);

alter table profiles enable row level security;

create policy "Users read own profile"
  on profiles for select using (auth.uid() = id);

create policy "Users read partner profile"
  on profiles for select using (auth.uid() = partner_id or id = (select partner_id from profiles where id = auth.uid()));

create policy "Users update own profile"
  on profiles for update using (auth.uid() = id);

-- Admin policies (from migration 002)
create policy "Admin read all profiles"
  on profiles for select
  using (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. COUPLES
create table couples (
  id uuid primary key default gen_random_uuid(),
  user_a_id uuid references profiles(id) not null,
  user_b_id uuid references profiles(id),
  pairing_code text unique,
  pairing_code_expires_at timestamptz,
  encryption_pub_key text,
  relationship_started_at date,
  paired_at timestamptz,
  status text default 'pending' check (status in ('pending', 'active', 'paused', 'ended')),
  created_at timestamptz default now()
);

alter table couples enable row level security;

create policy "Couple members can read"
  on couples for select using (auth.uid() in (user_a_id, user_b_id));

create policy "Couple members can update"
  on couples for update using (auth.uid() in (user_a_id, user_b_id));

-- CRITICAL FIX: Insert policy must exist for createPairingCode() to work
create policy "Users can create couples"
  on couples for insert with check (auth.uid() = user_a_id);

-- CRITICAL FIX: User A must be able to update their pending couple (before user_b exists)
create policy "User A can update pending couple"
  on couples for update using (auth.uid() = user_a_id);

-- Admin policies
create policy "Admin read all couples"
  on couples for select
  using (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. DEVICE KEYS (E2EE)
create table device_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  device_fingerprint text not null,
  public_key text not null,
  encrypted_private_key text not null,
  encryption_salt text not null default '',
  last_used_at timestamptz default now()
);

alter table device_keys enable row level security;

create policy "Own keys only"
  on device_keys for all using (auth.uid() = user_id);

create policy "Admin read all device_keys"
  on device_keys for select
  using (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. VAULTS
create table vaults (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  name text default 'My Vault',
  encryption_key_salt text not null
);

alter table vaults enable row level security;

create policy "Own vault only"
  on vaults for all using (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. MESSAGES
create table messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid references profiles(id) not null,
  couple_id uuid references couples(id) not null,
  vault_id uuid references vaults(id),
  content_encrypted text not null,
  content_encrypted_key text,
  content_nonce text not null,
  attachment_id uuid,
  is_edited boolean default false,
  is_deleted boolean default false,
  deleted_for_both boolean default false,
  pinned boolean default false,
  reply_to_id uuid references messages(id),
  reactions jsonb default '{}',
  ai_suggested boolean default false,
  created_at timestamptz default now()
);

alter table messages enable row level security;

create policy "Read shared messages"
  on messages for select using (
    vault_id is null and couple_id in (select id from couples where user_a_id = auth.uid() or user_b_id = auth.uid())
  );

create policy "Read vault messages"
  on messages for select using (
    vault_id is not null and sender_id = auth.uid()
  );

create policy "Insert own messages"
  on messages for insert with check (auth.uid() = sender_id);

create policy "Update own messages"
  on messages for update using (auth.uid() = sender_id);

create policy "Admin read all messages"
  on messages for select
  using (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

-- ═══════════════════════════════════════════════════════════════════════════════
-- 6. ATTACHMENTS
create table attachments (
  id uuid primary key default gen_random_uuid(),
  uploader_id uuid references profiles(id),
  file_type text not null check (file_type in ('image', 'audio', 'video')),
  storage_path text not null,
  thumbnail_path text,
  duration int,
  expires_at timestamptz,
  created_at timestamptz default now()
);

alter table attachments enable row level security;

create policy "Own attachments"
  on attachments for all using (auth.uid() = uploader_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 7. CYCLE LOGS
create table cycle_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  start_date date not null,
  end_date date,
  flow_level int check (flow_level between 1 and 5),
  symptoms jsonb default '{}',
  basal_temp decimal,
  notes_encrypted text,
  shared_with_partner boolean default false,
  created_at timestamptz default now()
);

alter table cycle_logs enable row level security;

create policy "Own cycle logs"
  on cycle_logs for all using (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 8. CYCLE PREDICTIONS
create table cycle_predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  predicted_start date,
  predicted_end date,
  confidence int,
  fertility_window_start date,
  fertility_window_end date,
  pms_window_start date,
  ai_note text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  unique (user_id)
);

alter table cycle_predictions enable row level security;

create policy "Own predictions"
  on cycle_predictions for all using (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 9. MEMORY PINS (for Maps page)
create table memory_pins (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid references couples(id) on delete cascade not null,
  creator_id uuid references profiles(id) not null,
  lat double precision not null,
  lng double precision not null,
  title text not null,
  content_encrypted text,
  media_urls jsonb default '[]',
  unlock_radius_meters int default 100,
  unlocked_at timestamptz,
  created_at timestamptz default now()
);

alter table memory_pins enable row level security;

create policy "Couple members read memory_pins"
  on memory_pins for select
  using (couple_id in (select id from couples where user_a_id = auth.uid() or user_b_id = auth.uid()));

create policy "Couple members insert memory_pins"
  on memory_pins for insert
  with check (couple_id in (select id from couples where user_a_id = auth.uid() or user_b_id = auth.uid()));

create policy "Creator update memory_pins"
  on memory_pins for update using (auth.uid() = creator_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 10. FEEDBACK (for Admin page)
create table feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete set null,
  category text not null check (category in ('bug', 'feature', 'general')),
  title text not null,
  description text,
  status text default 'open' check (status in ('open', 'reviewing', 'resolved')),
  created_at timestamptz default now()
);

alter table feedback enable row level security;

create policy "Users insert own feedback"
  on feedback for insert with check (auth.uid() = user_id);

create policy "Admin read all feedback"
  on feedback for select
  using (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

create policy "Admin update feedback"
  on feedback for update
  using (exists (select 1 from profiles where id = auth.uid() and is_admin = true));

-- ═══════════════════════════════════════════════════════════════════════════════
-- 11. GAME SESSIONS
create table game_sessions (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid references couples(id) on delete cascade not null,
  game_type text not null check (game_type in ('sync_quiz', 'tic_tac_toe', 'connect_4')),
  state jsonb default '{}',
  current_turn uuid references profiles(id),
  winner_id uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table game_sessions enable row level security;

create policy "Couple members read game_sessions"
  on game_sessions for select
  using (couple_id in (select id from couples where user_a_id = auth.uid() or user_b_id = auth.uid()));

create policy "Couple members update game_sessions"
  on game_sessions for update
  using (couple_id in (select id from couples where user_a_id = auth.uid() or user_b_id = auth.uid()));

create policy "Couple members insert game_sessions"
  on game_sessions for insert
  with check (couple_id in (select id from couples where user_a_id = auth.uid() or user_b_id = auth.uid()));

-- ═══════════════════════════════════════════════════════════════════════════════
-- 12. QUESTS
create table quests (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid references couples(id) on delete cascade not null,
  title text not null,
  description text,
  token_reward int default 0,
  assigned_to uuid references profiles(id),
  completed_by uuid references profiles(id),
  status text default 'open' check (status in ('open', 'completed', 'redeemed')),
  created_at timestamptz default now()
);

alter table quests enable row level security;

create policy "Couple members read quests"
  on quests for select
  using (couple_id in (select id from couples where user_a_id = auth.uid() or user_b_id = auth.uid()));

create policy "Couple members insert quests"
  on quests for insert
  with check (couple_id in (select id from couples where user_a_id = auth.uid() or user_b_id = auth.uid()));

create policy "Couple members update quests"
  on quests for update
  using (couple_id in (select id from couples where user_a_id = auth.uid() or user_b_id = auth.uid()));

-- ═══════════════════════════════════════════════════════════════════════════════
-- 13. WEBRTC SIGNALS (for call signaling fallback)
create table webrtc_signals (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid references couples(id) on delete cascade not null,
  sender_id uuid references profiles(id) not null,
  recipient_id uuid references profiles(id) not null,
  signal_type text not null check (signal_type in ('offer', 'answer', 'ice-candidate')),
  payload jsonb not null,
  created_at timestamptz default now()
);

alter table webrtc_signals enable row level security;

create policy "Own signals"
  on webrtc_signals for all
  using (auth.uid() in (sender_id, recipient_id));

-- ═══════════════════════════════════════════════════════════════════════════════
-- INDEXES for performance
-- ═══════════════════════════════════════════════════════════════════════════════
create index if not exists idx_messages_couple_id on messages(couple_id);
create index if not exists idx_messages_vault_id on messages(vault_id) where vault_id is not null;
create index if not exists idx_messages_created_at on messages(created_at);
create index if not exists idx_couples_pairing_code on couples(pairing_code) where status = 'pending';
create index if not exists idx_couples_user_a on couples(user_a_id);
create index if not exists idx_couples_user_b on couples(user_b_id) where user_b_id is not null;
create index if not exists idx_device_keys_user on device_keys(user_id);
create index if not exists idx_cycle_logs_user on cycle_logs(user_id);
create index if not exists idx_memory_pins_couple on memory_pins(couple_id);
create index if not exists idx_feedback_status on feedback(status);
create index if not exists idx_game_sessions_couple on game_sessions(couple_id);
create index if not exists idx_webrtc_signals_couple on webrtc_signals(couple_id);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 14. AUTH TRIGGER — Auto-create profile on new user signup
--    CRITICAL: This was MISSING from the original schema (001-003).
--    Without it, no profile row exists when a user signs up, causing:
--      • Onboarding data (avatar, display_name, love_language) to fail silently
--      • Pairing code verification to fail when updating partner_id
--      • completePairing() to fail when setting onboarding_completed
--    This trigger runs AFTER INSERT on auth.users and creates the profile row.
-- ═══════════════════════════════════════════════════════════════════════════════

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
end;
$$;

-- Drop existing trigger to allow clean re-runs
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
