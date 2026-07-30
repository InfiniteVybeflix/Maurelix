"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function AppRoot() {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push("/login");
        return;
      }
      supabase
        .from("profiles")
        .select("onboarding_completed, partner_id")
        .eq("id", user.id)
        .single()
        .then(({ data }) => {
          if (!data?.onboarding_completed) router.push("/onboarding");
          else if (!data?.partner_id) router.push("/onboarding");
          else router.push("/app/chat");
        });
    });
  }, [router, supabase]);

  return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ background: "linear-gradient(180deg, #050510 0%, #0a0a1a 100%)" }}
    >
      <div className="w-8 h-8 border-2 border-[#FF6B8A]/30 border-t-[#FF6B8A] rounded-full animate-spin" />
    </div>
  );
}
