"use client";

import { createClient } from "@/lib/supabase/client";

export function generatePairingCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function createPairingCode(): Promise<{ code: string; expiresAt: Date } | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const code = generatePairingCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

  const { data: existing } = await supabase.from("couples").select("id").eq("user_a_id", user.id).single();
  if (existing) {
    await supabase.from("couples").update({ pairing_code: code, pairing_code_expires_at: expiresAt.toISOString() }).eq("id", existing.id);
  } else {
    await supabase.from("couples").insert({ user_a_id: user.id, pairing_code: code, pairing_code_expires_at: expiresAt.toISOString(), status: "pending" });
  }

  return { code, expiresAt };
}

export async function verifyPairingCode(code: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const { data: couple } = await supabase
    .from("couples")
    .select("id, user_a_id, pairing_code_expires_at")
    .eq("pairing_code", code)
    .single();

  if (!couple) return { success: false, error: "Invalid code" };
  if (couple.user_a_id === user.id) return { success: false, error: "Cannot pair with yourself" };
  if (new Date(couple.pairing_code_expires_at) < new Date()) return { success: false, error: "Code expired" };

  const { error } = await supabase
    .from("couples")
    .update({ user_b_id: user.id, status: "active", relationship_started_at: new Date().toISOString().split("T")[0] })
    .eq("id", couple.id);

  if (error) return { success: false, error: error.message };

  await supabase.from("profiles").update({ partner_id: couple.user_a_id }).eq("id", user.id);
  await supabase.from("profiles").update({ partner_id: user.id }).eq("id", couple.user_a_id);

  return { success: true };
}

export async function completePairing(): Promise<void> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  await supabase.from("profiles").update({ onboarding_completed: true }).eq("id", user.id);
}
