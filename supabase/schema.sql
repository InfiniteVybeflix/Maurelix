-- Enable extensions
create extension if not exists "uuid-ossp";

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
  created_at timestamptz default now()
);

alter table profiles enable row level security;

create policy "Users read own profile"
  on profiles for select using (auth.uid() = id);

create policy "Users read partner profile"
  on profiles for select using (auth.uid() = partner_id or id = (select partner_id from profiles where id = auth.uid()));

create policy "Users update own profile"
  on profiles for update using (auth.uid() = id);

-- 2. COUPLES
create table couples (
  id uuid primary key default gen_random_uuid(),
  user_a_id uuid references profiles(id) not null,
  user_b_id uuid references profiles(id),
  pairing_code text unique,
  pairing_code_expires_at timestamptz,
  encryption_pub_key text,
  relationship_started_at date,
  status text default 'pending' check (status in ('pending', 'active', 'paused', 'ended')),
  created_at timestamptz default now()
);

alter table couples enable row level security;

create policy "Couple members can read"
  on couples for select using (auth.uid() in (user_a_id, user_b_id));

create policy "Couple members can update"
  on couples for update using (auth.uid() in (user_a_id, user_b_id));

-- 3. DEVICE KEYS (E2EE)
create table device_keys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  device_fingerprint text not null,
  public_key text not null,
  encrypted_private_key text not null,
  last_used_at timestamptz default now()
);

alter table device_keys enable row level security;

create policy "Own keys only"
  on device_keys for all using (auth.uid() = user_id);

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
  shared_with_partner boolean default true,
  created_at timestamptz default now()
);

alter table cycle_logs enable row level security;

create policy "Own logs"
  on cycle_logs for all using (auth.uid() = user_id);

create policy "Partner can view shared"
  on cycle_logs for select using (
    shared_with_partner = true and user_id = (select partner_id from profiles where id = auth.uid())
  );

-- 8. CYCLE PREDICTIONS
create table cycle_predictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  predicted_start date,
  predicted_end date,
  confidence int check (confidence between 1 and 100),
  fertility_window_start date,
  fertility_window_end date,
  pms_window_start date,
  ai_note text,
  created_at timestamptz default now()
);

alter table cycle_predictions enable row level security;

create policy "Own predictions"
  on cycle_predictions for all using (auth.uid() = user_id);

create policy "Partner view shared"
  on cycle_predictions for select using (
    user_id = (select partner_id from profiles where id = auth.uid())
  );

-- 9. MEMORY PINS
create table memory_pins (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid references couples(id) on delete cascade,
  creator_id uuid references profiles(id),
  lat decimal not null,
  lng decimal not null,
  title text not null,
  content_encrypted text,
  media_urls jsonb default '[]',
  unlock_radius_meters int default 50,
  unlocked_at timestamptz,
  created_at timestamptz default now()
);

alter table memory_pins enable row level security;

create policy "Couple pins"
  on memory_pins for all using (
    couple_id in (select id from couples where user_a_id = auth.uid() or user_b_id = auth.uid())
  );

-- 10. QUESTS
create table quests (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid references couples(id) on delete cascade,
  title text not null,
  description text,
  token_reward int default 1,
  assigned_to uuid references profiles(id),
  completed_by uuid references profiles(id),
  status text default 'open' check (status in ('open', 'completed', 'redeemed')),
  created_at timestamptz default now()
);

alter table quests enable row level security;

create policy "Couple quests"
  on quests for all using (
    couple_id in (select id from couples where user_a_id = auth.uid() or user_b_id = auth.uid())
  );

-- 11. TOKEN BALANCE
create table token_balance (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  balance int default 0
);

alter table token_balance enable row level security;

create policy "Own balance"
  on token_balance for all using (auth.uid() = user_id);

-- 12. WEBRTC SIGNALS
create table webrtc_signals (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid references couples(id) on delete cascade,
  sender_id uuid references profiles(id),
  recipient_id uuid references profiles(id),
  signal_type text not null check (signal_type in ('offer', 'answer', 'ice-candidate')),
  payload jsonb not null,
  consumed boolean default false,
  created_at timestamptz default now()
);

alter table webrtc_signals enable row level security;

create policy "Signal participants"
  on webrtc_signals for all using (
    auth.uid() in (sender_id, recipient_id)
  );

-- 13. NOTIFICATIONS
create table notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  type text not null check (type in ('message', 'haptic', 'cycle_alert', 'memory_unlock', 'quest', 'ai_briefing')),
  title text not null,
  body text not null,
  data jsonb default '{}',
  read boolean default false,
  created_at timestamptz default now()
);

alter table notifications enable row level security;

create policy "Own notifications"
  on notifications for all using (auth.uid() = user_id);

-- 14. FEEDBACK
create table feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id),
  category text not null check (category in ('bug', 'feature', 'spam')),
  title text not null,
  description text not null,
  screenshot_url text,
  status text default 'open' check (status in ('open', 'reviewing', 'resolved')),
  created_at timestamptz default now()
);

alter table feedback enable row level security;

create policy "Own feedback"
  on feedback for all using (auth.uid() = user_id);

create policy "Admin read all"
  on feedback for select using (
    exists (select 1 from profiles where id = auth.uid() and is_admin = true)
  );

-- 15. GAME SESSIONS
create table game_sessions (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid references couples(id) on delete cascade,
  game_type text not null check (game_type in ('sync_quiz', 'tic_tac_toe', 'connect_4')),
  state jsonb not null default '{}',
  current_turn uuid references profiles(id),
  winner_id uuid references profiles(id),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table game_sessions enable row level security;

create policy "Couple games"
  on game_sessions for all using (
    couple_id in (select id from couples where user_a_id = auth.uid() or user_b_id = auth.uid())
  );

-- 16. GRATITUDE JAR
create table gratitude_jar (
  id uuid primary key default gen_random_uuid(),
  couple_id uuid references couples(id) on delete cascade,
  sender_id uuid references profiles(id),
  recipient_id uuid references profiles(id),
  message text not null,
  created_at timestamptz default now()
);

alter table gratitude_jar enable row level security;

create policy "Couple gratitude"
  on gratitude_jar for all using (
    couple_id in (select id from couples where user_a_id = auth.uid() or user_b_id = auth.uid())
  );

-- Functions
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', 'Maurelix User'));
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
