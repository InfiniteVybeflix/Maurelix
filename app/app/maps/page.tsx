"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { createClient } from "@/lib/supabase/client";
import type { MemoryPin } from "@/types";

// CRITICAL FIX: Dynamically import the entire map component with ssr: false.
// Leaflet accesses `window` at module load time. Even dynamic imports of
// react-leaflet components don't help because `import L from "leaflet"`
// at the top of a file runs during SSR. By putting ALL leaflet code in
// a separate file and dynamically importing THAT file, we guarantee it
// never touches the server.
const MapView = dynamic(() => import("@/components/maps/map-view"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(180deg, #050510 0%, #0a0a1a 100%)" }}>
      <div className="w-8 h-8 border-2 border-[#FF6B8A]/30 border-t-[#FF6B8A] rounded-full animate-spin" />
    </div>
  ),
});

export default function MapsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [pins, setPins] = useState<MemoryPin[]>([]);
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      if (cancelled) return;
      setUserId(user.id);

      const { data: couple, error: coupleErr } = await supabase
        .from("couples")
        .select("*")
        .or(`user_a_id.eq."${user.id}",user_b_id.eq."${user.id}"`)
        .single();

      if (cancelled) return;

      if (coupleErr) {
        console.error("[Maps] Couple fetch error:", coupleErr);
        setError("Could not load your relationship data.");
        setLoading(false);
        return;
      }

      if (!couple) {
        setError("You need to be paired to use Memory Maps.");
        setLoading(false);
        return;
      }

      setCoupleId(couple.id);

      const { data: pinData, error: pinErr } = await supabase
        .from("memory_pins")
        .select("*")
        .eq("couple_id", couple.id);

      if (cancelled) return;

      if (pinErr) {
        console.error("[Maps] Pins fetch error:", pinErr);
        setError("Could not load memory pins.");
      } else {
        setPins(pinData || []);
      }

      setLoading(false);
    }

    init();
    return () => { cancelled = true; };
  }, [router, supabase]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(180deg, #050510 0%, #0a0a1a 100%)" }}>
        <div className="w-8 h-8 border-2 border-[#FF6B8A]/30 border-t-[#FF6B8A] rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{ background: "linear-gradient(180deg, #050510 0%, #0a0a1a 100%)" }}>
        <div className="w-16 h-16 rounded-full bg-red-400/10 border border-red-400/20 flex items-center justify-center mb-4">
          <span className="text-2xl">🗺️</span>
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Maps Unavailable</h2>
        <p className="text-sm text-white/40 text-center max-w-sm">{error}</p>
        <button
          onClick={() => router.push("/app/chat")}
          className="mt-6 px-6 py-3 rounded-2xl text-white font-medium text-sm btn-glow"
          style={{ background: "linear-gradient(135deg, #FF6B8A, #e94560)" }}
        >
          Back to Chat
        </button>
      </div>
    );
  }

  if (!coupleId || !userId) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(180deg, #050510 0%, #0a0a1a 100%)" }}>
        <div className="w-8 h-8 border-2 border-[#FF6B8A]/30 border-t-[#FF6B8A] rounded-full animate-spin" />
      </div>
    );
  }

  return <MapView initialPins={pins} coupleId={coupleId} userId={userId} onBack={() => router.push("/app/chat")} />;
}
