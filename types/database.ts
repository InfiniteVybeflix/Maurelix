export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string;
          avatar_url: string | null;
          is_admin: boolean;
          partner_id: string | null;
          ai_name: string;
          theme_color: string;
          wallpaper_url: string | null;
          onboarding_completed: boolean;
          love_language: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name?: string;
          avatar_url?: string | null;
          is_admin?: boolean;
          partner_id?: string | null;
          ai_name?: string;
          theme_color?: string;
          wallpaper_url?: string | null;
          onboarding_completed?: boolean;
          love_language?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          display_name?: string;
          avatar_url?: string | null;
          is_admin?: boolean;
          partner_id?: string | null;
          ai_name?: string;
          theme_color?: string;
          wallpaper_url?: string | null;
          onboarding_completed?: boolean;
          love_language?: string | null;
          created_at?: string;
        };
      };
      couples: {
        Row: { id: string; user_a_id: string; user_b_id: string | null; pairing_code: string | null; pairing_code_expires_at: string | null; encryption_pub_key: string | null; relationship_started_at: string | null; status: string; created_at: string; };
        Insert: { id?: string; user_a_id: string; user_b_id?: string | null; pairing_code?: string | null; pairing_code_expires_at?: string | null; encryption_pub_key?: string | null; relationship_started_at?: string | null; status?: string; created_at?: string; };
        Update: { id?: string; user_a_id?: string; user_b_id?: string | null; pairing_code?: string | null; pairing_code_expires_at?: string | null; encryption_pub_key?: string | null; relationship_started_at?: string | null; status?: string; created_at?: string; };
      };
      messages: {
        Row: { id: string; sender_id: string; couple_id: string; vault_id: string | null; content_encrypted: string; content_encrypted_key: string | null; content_nonce: string; attachment_id: string | null; is_edited: boolean; is_deleted: boolean; deleted_for_both: boolean; pinned: boolean; reply_to_id: string | null; reactions: Json; ai_suggested: boolean; created_at: string; };
        Insert: { id?: string; sender_id: string; couple_id: string; vault_id?: string | null; content_encrypted: string; content_encrypted_key?: string | null; content_nonce?: string; attachment_id?: string | null; is_edited?: boolean; is_deleted?: boolean; deleted_for_both?: boolean; pinned?: boolean; reply_to_id?: string | null; reactions?: Json; ai_suggested?: boolean; created_at?: string; };
        Update: { id?: string; sender_id?: string; couple_id?: string; vault_id?: string | null; content_encrypted?: string; content_encrypted_key?: string | null; content_nonce?: string; attachment_id?: string | null; is_edited?: boolean; is_deleted?: boolean; deleted_for_both?: boolean; pinned?: boolean; reply_to_id?: string | null; reactions?: Json; ai_suggested?: boolean; created_at?: string; };
      };
      attachments: {
        Row: { id: string; uploader_id: string; file_type: string; storage_path: string; thumbnail_path: string | null; duration: number | null; expires_at: string | null; created_at: string; };
        Insert: { id?: string; uploader_id: string; file_type: string; storage_path: string; thumbnail_path?: string | null; duration?: number | null; expires_at?: string | null; created_at?: string; };
        Update: { id?: string; uploader_id?: string; file_type?: string; storage_path?: string; thumbnail_path?: string | null; duration?: number | null; expires_at?: string | null; created_at?: string; };
      };
      cycle_logs: {
        Row: { id: string; user_id: string; start_date: string; end_date: string | null; flow_level: number | null; symptoms: Json; basal_temp: number | null; notes_encrypted: string | null; shared_with_partner: boolean; created_at: string; };
        Insert: { id?: string; user_id: string; start_date: string; end_date?: string | null; flow_level?: number | null; symptoms?: Json; basal_temp?: number | null; notes_encrypted?: string | null; shared_with_partner?: boolean; created_at?: string; };
        Update: { id?: string; user_id?: string; start_date?: string; end_date?: string | null; flow_level?: number | null; symptoms?: Json; basal_temp?: number | null; notes_encrypted?: string | null; shared_with_partner?: boolean; created_at?: string; };
      };
      cycle_predictions: {
        Row: { id: string; user_id: string; predicted_start: string | null; predicted_end: string | null; confidence: number | null; fertility_window_start: string | null; fertility_window_end: string | null; pms_window_start: string | null; ai_note: string | null; created_at: string; };
        Insert: { id?: string; user_id: string; predicted_start?: string | null; predicted_end?: string | null; confidence?: number | null; fertility_window_start?: string | null; fertility_window_end?: string | null; pms_window_start?: string | null; ai_note?: string | null; created_at?: string; };
        Update: { id?: string; user_id?: string; predicted_start?: string | null; predicted_end?: string | null; confidence?: number | null; fertility_window_start?: string | null; fertility_window_end?: string | null; pms_window_start?: string | null; ai_note?: string | null; created_at?: string; };
      };
      memory_pins: {
        Row: { id: string; couple_id: string; creator_id: string; lat: number; lng: number; title: string; content_encrypted: string | null; media_urls: Json; unlock_radius_meters: number; unlocked_at: string | null; created_at: string; };
        Insert: { id?: string; couple_id: string; creator_id: string; lat: number; lng: number; title: string; content_encrypted?: string | null; media_urls?: Json; unlock_radius_meters?: number; unlocked_at?: string | null; created_at?: string; };
        Update: { id?: string; couple_id?: string; creator_id?: string; lat?: number; lng?: number; title?: string; content_encrypted?: string | null; media_urls?: Json; unlock_radius_meters?: number; unlocked_at?: string | null; created_at?: string; };
      };
      quests: {
        Row: { id: string; couple_id: string; title: string; description: string | null; token_reward: number; assigned_to: string | null; completed_by: string | null; status: string; created_at: string; };
        Insert: { id?: string; couple_id: string; title: string; description?: string | null; token_reward?: number; assigned_to?: string | null; completed_by?: string | null; status?: string; created_at?: string; };
        Update: { id?: string; couple_id?: string; title?: string; description?: string | null; token_reward?: number; assigned_to?: string | null; completed_by?: string | null; status?: string; created_at?: string; };
      };
      token_balance: {
        Row: { id: string; user_id: string; balance: number; };
        Insert: { id?: string; user_id: string; balance?: number; };
        Update: { id?: string; user_id?: string; balance?: number; };
      };
      webrtc_signals: {
        Row: { id: string; couple_id: string; sender_id: string; recipient_id: string; signal_type: string; payload: Json; consumed: boolean; created_at: string; };
        Insert: { id?: string; couple_id: string; sender_id: string; recipient_id: string; signal_type: string; payload: Json; consumed?: boolean; created_at?: string; };
        Update: { id?: string; couple_id?: string; sender_id?: string; recipient_id?: string; signal_type?: string; payload?: Json; consumed?: boolean; created_at?: string; };
      };
      notifications: {
        Row: { id: string; user_id: string; type: string; title: string; body: string; data: Json; read: boolean; created_at: string; };
        Insert: { id?: string; user_id: string; type: string; title: string; body: string; data?: Json; read?: boolean; created_at?: string; };
        Update: { id?: string; user_id?: string; type?: string; title?: string; body?: string; data?: Json; read?: boolean; created_at?: string; };
      };
      feedback: {
        Row: { id: string; user_id: string; category: string; title: string; description: string; screenshot_url: string | null; status: string; created_at: string; };
        Insert: { id?: string; user_id: string; category: string; title: string; description: string; screenshot_url?: string | null; status?: string; created_at?: string; };
        Update: { id?: string; user_id?: string; category?: string; title?: string; description?: string; screenshot_url?: string | null; status?: string; created_at?: string; };
      };
      game_sessions: {
        Row: { id: string; couple_id: string; game_type: string; state: Json; current_turn: string | null; winner_id: string | null; created_at: string; updated_at: string; };
        Insert: { id?: string; couple_id: string; game_type: string; state?: Json; current_turn?: string | null; winner_id?: string | null; created_at?: string; updated_at?: string; };
        Update: { id?: string; couple_id?: string; game_type?: string; state?: Json; current_turn?: string | null; winner_id?: string | null; created_at?: string; updated_at?: string; };
      };
      gratitude_jar: {
        Row: { id: string; couple_id: string; sender_id: string; recipient_id: string; message: string; created_at: string; };
        Insert: { id?: string; couple_id: string; sender_id: string; recipient_id: string; message: string; created_at?: string; };
        Update: { id?: string; couple_id?: string; sender_id?: string; recipient_id?: string; message?: string; created_at?: string; };
      };
      device_keys: {
        Row: { id: string; user_id: string; device_fingerprint: string; public_key: string; encrypted_private_key: string; last_used_at: string; };
        Insert: { id?: string; user_id: string; device_fingerprint: string; public_key: string; encrypted_private_key: string; last_used_at?: string; };
        Update: { id?: string; user_id?: string; device_fingerprint?: string; public_key?: string; encrypted_private_key?: string; last_used_at?: string; };
      };
      vaults: {
        Row: { id: string; user_id: string; name: string; encryption_key_salt: string; };
        Insert: { id?: string; user_id: string; name?: string; encryption_key_salt: string; };
        Update: { id?: string; user_id?: string; name?: string; encryption_key_salt?: string; };
      };
    };
  };
}
