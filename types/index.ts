export interface Profile {
  id: string;
  display_name: string;
  avatar_url?: string;
  is_admin: boolean;
  partner_id?: string;
  ai_name: string;
  theme_color: string;
  wallpaper_url?: string;
  onboarding_completed: boolean;
  love_language?: string;
  created_at: string;
}

export interface Couple {
  id: string;
  user_a_id: string;
  user_b_id?: string;
  pairing_code?: string;
  pairing_code_expires_at?: string;
  encryption_pub_key?: string;
  relationship_started_at?: string;
  status: "pending" | "active" | "paused" | "ended";
  created_at: string;
}

export interface Message {
  id: string;
  sender_id: string;
  couple_id: string;
  vault_id?: string;
  content_encrypted: string;
  content_encrypted_key?: string;
  content_nonce: string;
  attachment_id?: string;
  is_edited: boolean;
  is_deleted: boolean;
  deleted_for_both: boolean;
  pinned: boolean;
  reply_to_id?: string;
  reactions: Record<string, string[]>;
  ai_suggested: boolean;
  created_at: string;
  sender?: Profile;
  decrypted_content?: string;
}

export interface CycleLog {
  id: string;
  user_id: string;
  start_date: string;
  end_date?: string;
  flow_level?: number;
  symptoms?: Record<string, boolean>;
  basal_temp?: number;
  notes_encrypted?: string;
  shared_with_partner: boolean;
  created_at: string;
}

export interface CyclePrediction {
  id: string;
  user_id: string;
  predicted_start: string | null;
  predicted_end: string | null;
  confidence: number;
  fertility_window_start: string | null;
  fertility_window_end: string | null;
  pms_window_start: string | null;
  ai_note?: string | null;
  created_at: string;
}

export interface MemoryPin {
  id: string;
  couple_id: string;
  creator_id: string;
  lat: number;
  lng: number;
  title: string;
  content_encrypted?: string;
  media_urls?: string[];
  unlock_radius_meters: number;
  unlocked_at?: string;
  created_at: string;
}

export interface Quest {
  id: string;
  couple_id: string;
  title: string;
  description?: string;
  token_reward: number;
  assigned_to?: string;
  completed_by?: string;
  status: "open" | "completed" | "redeemed";
  created_at: string;
}

export interface GameSession {
  id: string;
  couple_id: string;
  game_type: "sync_quiz" | "tic_tac_toe" | "connect_4";
  state: Record<string, unknown>;
  current_turn?: string;
  winner_id?: string;
  created_at: string;
  updated_at: string;
}
