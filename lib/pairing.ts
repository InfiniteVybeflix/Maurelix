import { createClient } from "@/lib/supabase/client";

export interface PairingResult {
  code: string;
  expiresAt: Date;
}

export interface PairingError {
  error: string;
  details?: string;
}

export async function generatePairingCode(): Promise<string> {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Creates or updates a pairing code for the current user.
 * Returns the code + expiry, or a structured error.
 */
export async function createPairingCode(): Promise<
  { success: true; data: PairingResult } | { success: false; error: PairingError }
> {
  const supabase = createClient();

  // 1. Verify authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      success: false,
      error: { error: "You must be signed in to generate a pairing code." },
    };
  }

  // 2. Check if user already has an ACTIVE couple
  // CRITICAL FIX: Do NOT wrap UUID values in double quotes inside .or() strings.
  // PostgREST interprets quoted values literally, so eq."uuid" tries to match
  // the string "uuid" (with quotes) against a UUID column, causing a type error.
  const { data: existingActive, error: activeError } = await supabase
    .from("couples")
    .select("id, status")
    .or(`user_a_id.eq.${user.id},user_b_id.eq.${user.id}`)
    .eq("status", "active")
    .maybeSingle();

  if (activeError) {
    console.error("[createPairingCode] Active couple query error:", activeError);
    return {
      success: false,
      error: {
        error: "Database error while checking existing relationship.",
        details: activeError.message,
      },
    };
  }

  if (existingActive) {
    return {
      success: false,
      error: {
        error: "You are already paired with someone. Leave your current relationship first to generate a new code.",
      },
    };
  }

  // 3. Generate new code
  const code = await generatePairingCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // 4. Check for existing PENDING couple created by this user
  const { data: existingPending, error: pendingError } = await supabase
    .from("couples")
    .select("id, user_a_id, status")
    .eq("user_a_id", user.id)
    .eq("status", "pending")
    .maybeSingle();

  if (pendingError) {
    console.error("[createPairingCode] Pending couple query error:", pendingError);
    return {
      success: false,
      error: {
        error: "Database error while checking pending status.",
        details: pendingError.message,
      },
    };
  }

  // 5. Update existing pending record OR insert new one
  if (existingPending) {
    const { error: updateError } = await supabase
      .from("couples")
      .update({
        pairing_code: code,
        pairing_code_expires_at: expiresAt.toISOString(),
        status: "pending",
      })
      .eq("id", existingPending.id);

    if (updateError) {
      console.error("[createPairingCode] Update error:", updateError);
      return {
        success: false,
        error: {
          error: "Failed to update pairing code. This usually means your database is missing the required RLS policy.",
          details: updateError.message,
        },
      };
    }
  } else {
    const { error: insertError } = await supabase.from("couples").insert({
      user_a_id: user.id,
      pairing_code: code,
      pairing_code_expires_at: expiresAt.toISOString(),
      status: "pending",
    });

    if (insertError) {
      console.error("[createPairingCode] Insert error:", insertError);
      return {
        success: false,
        error: {
          error: "Failed to create pairing code. This usually means your database is missing the required RLS INSERT policy on the 'couples' table. Run migration 003_fix_pairing_rls.sql.",
          details: insertError.message,
        },
      };
    }
  }

  return { success: true, data: { code, expiresAt } };
}

/**
 * Verifies a pairing code entered by the current user.
 */
export async function verifyPairingCode(
  code: string
): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return { success: false, error: "Not authenticated. Please sign in." };
  }

  const trimmedCode = code.trim();
  if (!/^\d{6}$/.test(trimmedCode)) {
    return { success: false, error: "Code must be exactly 6 digits." };
  }

  // Find the pending couple with this code
  const { data: couple, error } = await supabase
    .from("couples")
    .select("id, user_a_id, pairing_code_expires_at, status")
    .eq("pairing_code", trimmedCode)
    .eq("status", "pending")
    .maybeSingle();

  if (error) {
    console.error("[verifyPairingCode] Query error:", error);
    return { success: false, error: "Database error. Please try again." };
  }

  if (!couple) {
    return {
      success: false,
      error: "Invalid or expired code. Make sure you entered it correctly.",
    };
  }

  if (couple.user_a_id === user.id) {
    return { success: false, error: "You cannot pair with yourself." };
  }

  if (new Date(couple.pairing_code_expires_at) < new Date()) {
    return { success: false, error: "This code has expired. Ask your partner to generate a new one." };
  }

  // Complete the pairing
  const { error: updateError } = await supabase
    .from("couples")
    .update({
      user_b_id: user.id,
      status: "active",
      paired_at: new Date().toISOString(),
    })
    .eq("id", couple.id);

  if (updateError) {
    console.error("[verifyPairingCode] Couple update error:", updateError);
    return { success: false, error: "Failed to complete pairing. Please try again." };
  }

  // Update both profiles
  const { error: profileError } = await supabase
    .from("profiles")
    .update({ partner_id: couple.user_a_id, onboarding_completed: true })
    .eq("id", user.id);

  const { error: partnerProfileError } = await supabase
    .from("profiles")
    .update({ partner_id: user.id, onboarding_completed: true })
    .eq("id", couple.user_a_id);

  if (profileError || partnerProfileError) {
    console.error(
      "[verifyPairingCode] Profile update error:",
      profileError?.message,
      partnerProfileError?.message
    );
  }

  return { success: true };
}

/**
 * Marks onboarding as completed for the current user.
 */
export async function completePairing(): Promise<boolean> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
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
