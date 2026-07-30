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
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) {
        router.push("/login");
        return;
      }
      supabase.from("profiles").select("is_admin").eq("id", user.id).single().then(({ data }) => {
        if (data?.is_admin) {
          setIsAdmin(true);
        } else {
          router.push("/app/chat");
        }
        setChecking(false);
      });
    });
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
