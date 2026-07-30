"use client";

import "leaflet/dist/leaflet.css";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Plus, X, Lock, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { MemoryPin } from "@/types";

const MapContainer = dynamic(() => import("react-leaflet").then((m) => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then((m) => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then((m) => m.Marker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then((m) => m.Popup), { ssr: false });

export default function MapsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [pins, setPins] = useState<MemoryPin[]>([]);
  const [user, setUser] = useState<any>(null);
  const [couple, setCouple] = useState<any>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newPin, setNewPin] = useState({ lat: 0, lng: 0, title: "", content: "" });
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: u } }) => {
      if (!u) { router.push("/login"); return; }
      setUser(u);
      supabase.from("couples").select("*").or(`user_a_id.eq.${u.id},user_b_id.eq.${u.id}`).single().then(({ data: c }) => {
        setCouple(c);
        if (c) {
          supabase.from("memory_pins").select("*").eq("couple_id", c.id).then(({ data }) => {
            setPins(data || []);
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
    const { data } = await supabase.from("memory_pins").insert({
      couple_id: couple.id,
      creator_id: user.id,
      lat: newPin.lat,
      lng: newPin.lng,
      title: newPin.title,
      content_encrypted: newPin.content,
    }).select().single();
    if (data) setPins((prev) => [...prev, data as MemoryPin]);
    setShowAdd(false);
    setNewPin({ lat: 0, lng: 0, title: "", content: "" });
  };

  const getLocation = () => {
    navigator.geolocation.getCurrentPosition((pos) => {
      setNewPin((p) => ({ ...p, lat: pos.coords.latitude, lng: pos.coords.longitude }));
    });
  };

  return (
    <div className="flex flex-col h-screen" style={{ background: "linear-gradient(180deg, #050510 0%, #0a0a1a 100%)" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06] shrink-0">
        <button onClick={() => router.push("/app/chat")} className="p-2 rounded-xl hover:bg-white/[0.05] text-white/40 hover:text-white/70 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-lg font-semibold text-white">Memory Maps</h1>
          <p className="text-[10px] text-white/30">{pins.length} memories pinned</p>
        </div>
        <button
          onClick={() => { getLocation(); setShowAdd(true); }}
          className="ml-auto p-2.5 rounded-xl bg-[#FF6B8A]/15 text-[#FF6B8A] hover:bg-[#FF6B8A]/25 transition-colors"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>

      {/* Map */}
      <div className="flex-1 relative">
        {mapReady && (
          <MapContainer
            center={[pins[0]?.lat || 0, pins[0]?.lng || 0]}
            zoom={2}
            className="w-full h-full"
            style={{ background: "#0a0a1a" }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            />
            {pins.map((pin) => (
              <Marker key={pin.id} position={[pin.lat, pin.lng]}>
                <Popup>
                  <div className="p-2">
                    <p className="font-semibold text-sm">{pin.title}</p>
                    <p className="text-xs text-gray-500 mt-1">{pin.content_encrypted}</p>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        )}
      </div>

      {/* Add Pin Modal */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          >
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="w-full max-w-md rounded-2xl glass shadow-2xl border border-white/10 p-5 space-y-4"
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">Pin a Memory</h3>
                <button onClick={() => setShowAdd(false)} className="p-1.5 rounded-lg hover:bg-white/[0.05] text-white/30">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input type="number" step="0.0001" value={newPin.lat || ""} onChange={(e) => setNewPin((p) => ({ ...p, lat: parseFloat(e.target.value) }))} placeholder="Latitude" className="px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white text-sm focus:outline-none focus:border-[#FF6B8A]/30" />
                <input type="number" step="0.0001" value={newPin.lng || ""} onChange={(e) => setNewPin((p) => ({ ...p, lng: parseFloat(e.target.value) }))} placeholder="Longitude" className="px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white text-sm focus:outline-none focus:border-[#FF6B8A]/30" />
              </div>
              <input type="text" value={newPin.title} onChange={(e) => setNewPin((p) => ({ ...p, title: e.target.value }))} placeholder="Memory title" className="w-full px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white text-sm focus:outline-none focus:border-[#FF6B8A]/30" />
              <textarea value={newPin.content} onChange={(e) => setNewPin((p) => ({ ...p, content: e.target.value }))} placeholder="What happened here?" rows={3} className="w-full px-3 py-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-white text-sm focus:outline-none focus:border-[#FF6B8A]/30 resize-none" />
              <button onClick={addPin} className="w-full py-3 rounded-2xl text-white font-medium text-sm btn-glow" style={{ background: "linear-gradient(135deg, #FF6B8A, #e94560)" }}>
                Pin Memory
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
