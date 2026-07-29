export interface Profile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  is_admin: boolean;
  partner_id: string | null;
  ai_name: string;
  theme_color: string;
  wallpaper_url: string | null;
  onboarding_completed: boolean;
  love_language: "words" | "acts" | "gifts" | "time" | "touch" | null;
  created_at: string;
}

export interface Couple {
  id: string;
  user_a_id: string;
  user_b_id: string | null;
  pairing_code: string | null;
  pairing_code_expires_at: string | null;
  encryption_pub_key: string | null;
  relationship_started_at: string | null;
  status: "pending" | "active" | "paused" | "ended";
  created_at: string;
}

export interface DeviceKey {
  id: string;
  user_id: string;
  device_fingerprint: string;
  public_key: string;
  encrypted_private_key: string;
  last_used_at: string;
}

export interface Vault {
  id: string;
  user_id: string;
  name: string;
  encryption_key_salt: string;
}

export interface Message {
  id: string;
  sender_id: string;
  couple_id: string;
  vault_id: string | null;
  content_encrypted: string;
  content_encrypted_key: string | null;
  content_nonce: string;
  attachment_id: string | null;
  is_edited: boolean;
  is_deleted: boolean;
  deleted_for_both: boolean;
  pinned: boolean;
  reply_to_id: string | null;
  reactions: Record<string, string[]>;
  ai_suggested: boolean;
  created_at: string;
  sender?: Profile;
  reply_to?: Message | null;
  decrypted_content?: string;
}

export interface Attachment {
  id: string;
  uploader_id: string;
  file_type: "image" | "audio" | "video";
  storage_path: string;
  thumbnail_path: string | null;
  duration: number | null;
  expires_at: string | null;
  created_at: string;
}

export interface CycleLog {
  id: string;
  user_id: string;
  start_date: string;
  end_date: string | null;
  flow_level: number | null;
  symptoms: Record<string, boolean>;
  basal_temp: number | null;
  notes_encrypted: string | null;
  shared_with_partner: boolean;
  created_at: string;
}

export interface CyclePrediction {
  id: string;
  user_id: string;
  predicted_start: string | null;
  predicted_end: string | null;
  confidence: number | null;
  fertility_window_start: string | null;
  fertility_window_end: string | null;
  pms_window_start: string | null;
  ai_note: string | null;
  created_at: string;
}

export interface MemoryPin {
  id: string;
  couple_id: string;
  creator_id: string;
  lat: number;
  lng: number;
  title: string;
  content_encrypted: string | null;
  media_urls: string[];
  unlock_radius_meters: number;
  unlocked_at: string | null;
  created_at: string;
}

export interface Quest {
  id: string;
  couple_id: string;
  title: string;
  description: string | null;
  token_reward: number;
  assigned_to: string | null;
  completed_by: string | null;
  status: "open" | "completed" | "redeemed";
  created_at: string;
}

export interface TokenBalance {
  id: string;
  user_id: string;
  balance: number;
}

export interface WebRTCSignal {
  id: string;
  couple_id: string;
  sender_id: string;
  recipient_id: string;
  signal_type: "offer" | "answer" | "ice-candidate";
  payload: unknown;
  consumed: boolean;
  created_at: string;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  type: "message" | "haptic" | "cycle_alert" | "memory_unlock" | "quest" | "ai_briefing";
  title: string;
  body: string;
  data: Record<string, unknown>;
  read: boolean;
  created_at: string;
}

export interface FeedbackItem {
  id: string;
  user_id: string;
  category: "bug" | "feature" | "spam";
  title: string;
  description: string;
  screenshot_url: string | null;
  status: "open" | "reviewing" | "resolved";
  created_at: string;
}

export interface GameSession {
  id: string;
  couple_id: string;
  game_type: "sync_quiz" | "tic_tac_toe" | "connect_4";
  state: unknown;
  current_turn: string | null;
  winner_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface GratitudeItem {
  id: string;
  couple_id: string;
  sender_id: string;
  recipient_id: string;
  message: string;
  created_at: string;
}
