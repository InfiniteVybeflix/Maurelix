"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AdminGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const supabase = createClient();
  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const checkAdmin = async () => {
      const { data: { user }, error: authError } = await supabase.auth.getUser();

      if (authError || !user) {
        console.log("[AdminGuard] No authenticated user, redirecting to /login");
        router.push("/login");
        setChecking(false);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("is_admin, onboarding_completed, partner_id, display_name")
        .eq("id", user.id)
        .maybeSingle();

      if (error) {
        console.error("[AdminGuard] Profile query error:", error.message);
        setChecking(false);
        router.push("/app");
        return;
      }

      if (!data) {
        console.error("[AdminGuard] No profile found for user", user.id, "— check RLS policies on profiles table.");
        setChecking(false);
        router.push("/app");
        return;
      }

      console.log("[AdminGuard] Profile loaded:", {
        is_admin: data.is_admin,
        onboarding_completed: data.onboarding_completed,
        partner_id: data.partner_id,
      });

      if (data.is_admin === true) {
        setIsAdmin(true);
      } else {
        console.log("[AdminGuard] User is not admin, redirecting to /app");
        router.push("/app");
      }

      setChecking(false);
    };

    checkAdmin();
  }, [router, supabase]);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(180deg, #050510 0%, #0a0a1a 100%)" }}>
        <div className="w-8 h-8 border-2 border-[#FF6B8A]/30 border-t-[#FF6B8A] rounded-full animate-spin" />
      </div>
    );
  }

  if (!isAdmin) return null;
  return <>{children}</>;
}
