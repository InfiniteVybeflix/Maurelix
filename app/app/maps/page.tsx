"use client";

import "leaflet/dist/leaflet.css";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Plus, X, Lock, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { MemoryPin } from "@/types";

// Dynamic imports to avoid SSR issues with Leaflet
const MapContainer = dynamic(() => import("react-leaflet").then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((m) => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then((m) => m.Marker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then((m) => m.Popup), { ssr: false });

// FIX: Import L from leaflet for custom icons
import L from "leaflet";

const defaultIcon = L.icon({
  iconUrl: "/icon-192x192.png",
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
});

export default function MapsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [pins, setPins] = useState<MemoryPin[]>([]);
  const [user, setUser] = useState<any>(null);
  const [couple, setCouple] = useState<any>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newPin, setNewPin] = useState({ lat: 0, lng: 0, title: "", content: "" });
  const [mapReady, setMapReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      if (!u) { router.push("/login"); return; }
      setUser(u);
      supabase.from("couples").select("*").or(`user_a_id.eq."${u.id}",user_b_id.eq."${u.id}"`).single().then(({ data: c, error: coupleErr }) => {
        if (coupleErr) {
          console.error("[Maps] Couple fetch error:", coupleErr);
          setError("Could not load your relationship data.");
          return;
        }
        setCouple(c);
        if (c) {
          supabase.from("memory_pins").select("*").eq("couple_id", c.id).then(({ data, error: pinErr }) => {
            if (pinErr) {
              console.error("[Maps] Pins fetch error:", pinErr);
              setError("Could not load memory pins.");
            } else {
              setPins(data || []);
            }
          });
        }
      });
    });
  }, [router, supabase]);

  useEffect(() => {
    setMapReady(true);
  }, []);

  const addPin = async () => {
    if (!couple || !newPin.title.trim()) return;
    setError("");
    const { data, error: insertErr } = await supabase
      .from("memory_pins")
      .insert({
        couple_id: couple.id,
        creator_id: user.id,
        lat: newPin.lat,
        lng: newPin.lng,
        title: newPin.title,
        content_encrypted: newPin.content,
      })
      .select()
      .single();

    if (insertErr) {
      console.error("[Maps] Insert pin error:", insertErr);
      setError("Failed to add pin. " + insertErr.message);
      return;
    }

    if (data) setPins((prev) => [...prev, data as MemoryPin]);
    setShowAdd(false);
    setNewPin({ lat: 0, lng: 0, title: "", content: "" });
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(180deg, #050510 0%, #0a0a1a 100%)" }}>
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06]">
        <button onClick={() => router.push("/app/chat")} className="p-2 rounded-xl hover:bg-white/[0.05] text-white/40 hover:text-white/70 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold text-white">Memory Maps</h1>
      </div>

      {error && (
        <div className="mx-4 mt-3 p-3 rounded-xl bg-red-400/10 border border-red-400/20 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="flex-1 relative">
        {mapReady && (
          <MapContainer
            center={pins.length > 0 ? [pins[0].lat, pins[0].lng] : [0, 0]}
            zoom={pins.length > 0 ? 13 : 2}
            className="w-full h-full"
            style={{ height: "calc(100vh - 60px)" }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            {pins.map((pin) => (
              <Marker key={pin.id} position={[pin.lat, pin.lng]} icon={defaultIcon}>
                <Popup>
                  <div className="text-sm">
                    <p className="font-semibold">{pin.title}</p>
                    {pin.content_encrypted && <p className="text-xs text-gray-500 mt-1">{pin.content_encrypted}</p>}
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        )}

        <button
          onClick={() => setShowAdd(true)}
          className="absolute bottom-6 right-6 w-12 h-12 rounded-full bg-gradient-to-br from-[#FF6B8A] to-[#e94560] flex items-center justify-center shadow-lg shadow-[#FF6B8A]/30 z-[1000]"
        >
          <Plus className="w-6 h-6 text-white" />
        </button>
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="absolute bottom-20 left-4 right-4 max-w-sm mx-auto rounded-2xl glass shadow-2xl border border-white/10 p-5 z-[1001]"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">Drop a Memory Pin</h3>
              <button onClick={() => setShowAdd(false)} className="p-1.5 rounded-lg hover:bg-white/[0.05] text-white/30">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Title (e.g., First Date)"
                value={newPin.title}
                onChange={(e) => setNewPin((p) => ({ ...p, title: e.target.value }))}
                className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#FF6B8A]/40"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  step="any"
                  placeholder="Latitude"
                  value={newPin.lat || ""}
                  onChange={(e) => setNewPin((p) => ({ ...p, lat: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#FF6B8A]/40"
                />
                <input
                  type="number"
                  step="any"
                  placeholder="Longitude"
                  value={newPin.lng || ""}
                  onChange={(e) => setNewPin((p) => ({ ...p, lng: parseFloat(e.target.value) || 0 }))}
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#FF6B8A]/40"
                />
              </div>
              <button
                onClick={addPin}
                disabled={!newPin.title.trim()}
                className="w-full py-3 rounded-xl text-white font-medium text-sm btn-glow disabled:opacity-30"
                style={{ background: "linear-gradient(135deg, #FF6B8A, #e94560)" }}
              >
                Save Pin
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
