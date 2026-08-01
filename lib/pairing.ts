import { createClient } from "@/lib/supabase/client";

export async function generatePairingCode(): Promise<string> {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function createPairingCode(): Promise<{ code: string; expiresAt: Date } | null> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const code = await generatePairingCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  const { data: existing } = await supabase
    .from("couples")
    .select("id")
    .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("couples")
      .update({
        pairing_code: code,
        pairing_code_expires_at: expiresAt.toISOString(),
        status: "pending",
      })
      .eq("id", existing.id);

    if (error) {
      console.error("[createPairingCode] Update error:", error.message);
      return null;
    }
  } else {
    const { error } = await supabase.from("couples").insert({
      user_a_id: user.id,
      pairing_code: code,
      pairing_code_expires_at: expiresAt.toISOString(),
      status: "pending",
    });

    if (error) {
      console.error("[createPairingCode] Insert error:", error.message);
      return null;
    }
  }

  return { code, expiresAt };
}

export async function verifyPairingCode(code: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  const trimmedCode = code.trim();
  if (!/^\d{6}$/.test(trimmedCode)) {
    return { success: false, error: "Code must be exactly 6 digits" };
  }

  const { data: couple, error } = await supabase
    .from("couples")
    .select("id, user_a_id, pairing_code_expires_at, status")
    .eq("pairing_code", trimmedCode)
    .eq("status", "pending")
    .maybeSingle();

  if (error) {
    console.error("[verifyPairingCode] Query error:", error.message);
    return { success: false, error: "Database error. Please try again." };
  }

  if (!couple) {
    return { success: false, error: "Invalid or expired code" };
  }

  if (couple.user_a_id === user.id) {
    return { success: false, error: "You cannot pair with yourself" };
  }

  if (new Date(couple.pairing_code_expires_at) < new Date()) {
    return { success: false, error: "Code has expired" };
  }

  const { error: updateError } = await supabase
    .from("couples")
    .update({
      user_b_id: user.id,
      status: "active",
      paired_at: new Date().toISOString(),
    })
    .eq("id", couple.id);

  if (updateError) {
    console.error("[verifyPairingCode] Couple update error:", updateError.message);
    return { success: false, error: "Failed to complete pairing" };
  }

  const { error: profileError } = await supabase.from("profiles").update({
    partner_id: couple.user_a_id,
    onboarding_completed: true,
  }).eq("id", user.id);

  const { error: partnerProfileError } = await supabase.from("profiles").update({
    partner_id: user.id,
    onboarding_completed: true,
  }).eq("id", couple.user_a_id);

  if (profileError || partnerProfileError) {
    console.error("[verifyPairingCode] Profile update error:", profileError?.message, partnerProfileError?.message);
  }

  return { success: true };
}

export async function completePairing(): Promise<boolean> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return false;

  const { error } = await supabase
    .from("profiles")
    .update({ onboarding_completed: true })
    .eq("id", user.id);

  if (error) {
    console.error("[completePairing] Error:", error.message);
    return false;
  }

  return true;
}
