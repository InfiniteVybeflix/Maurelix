"use client";

import { useState, useEffect, useCallback } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from "react-leaflet";
import L from "leaflet";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, X, ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { MemoryPin } from "@/types";
import "leaflet/dist/leaflet.css";

// Fix Leaflet default icon path issues in Next.js
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

const defaultIcon = L.icon({
  iconUrl: markerIcon.src,
  shadowUrl: markerShadow.src,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = defaultIcon;

interface MapViewProps {
  initialPins: MemoryPin[];
  coupleId: string;
  userId: string;
  onBack: () => void;
}

function MapClickHandler({ onClick }: { onClick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function MapView({ initialPins, coupleId, userId, onBack }: MapViewProps) {
  const supabase = createClient();
  const [pins, setPins] = useState<MemoryPin[]>(initialPins);
  const [showAdd, setShowAdd] = useState(false);
  const [newPin, setNewPin] = useState<{ lat: number; lng: number; title: string; content: string }>({
    lat: 0,
    lng: 0,
    title: "",
    content: "",
  });
  const [error, setError] = useState("");
  const [mapCenter, setMapCenter] = useState<[number, number]>(
    initialPins.length > 0 ? [initialPins[0].lat, initialPins[0].lng] : [0, 0]
  );

  const handleMapClick = useCallback((lat: number, lng: number) => {
    setNewPin((p) => ({ ...p, lat, lng }));
    setShowAdd(true);
  }, []);

  const addPin = async () => {
    if (!newPin.title.trim()) return;
    setError("");

    const { data, error: insertErr } = await supabase
      .from("memory_pins")
      .insert({
        couple_id: coupleId,
        creator_id: userId,
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

    if (data) {
      setPins((prev) => [...prev, data as MemoryPin]);
      setMapCenter([data.lat, data.lng]);
    }
    setShowAdd(false);
    setNewPin({ lat: 0, lng: 0, title: "", content: "" });
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(180deg, #050510 0%, #0a0a1a 100%)" }}>
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/[0.06]">
        <button
          onClick={onBack}
          className="p-2 rounded-xl hover:bg-white/[0.05] text-white/40 hover:text-white/70 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-semibold text-white">Memory Maps</h1>
      </div>

      {error && (
        <div className="mx-4 mt-3 p-3 rounded-xl bg-red-400/10 border border-red-400/20 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="flex-1 relative" style={{ minHeight: "calc(100vh - 60px)" }}>
        <MapContainer
          center={mapCenter}
          zoom={initialPins.length > 0 ? 13 : 2}
          className="w-full h-full"
          style={{ height: "100%", minHeight: "calc(100vh - 60px)" }}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <MapClickHandler onClick={handleMapClick} />
          {pins.map((pin) => (
            <Marker key={pin.id} position={[pin.lat, pin.lng]} icon={defaultIcon}>
              <Popup>
                <div className="text-sm">
                  <p className="font-semibold">{pin.title}</p>
                  {pin.content_encrypted && (
                    <p className="text-xs text-gray-500 mt-1">{pin.content_encrypted}</p>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        <div className="absolute bottom-6 right-6 z-[1000] flex flex-col gap-3">
          <button
            onClick={() => setShowAdd(true)}
            className="w-12 h-12 rounded-full bg-gradient-to-br from-[#FF6B8A] to-[#e94560] flex items-center justify-center shadow-lg shadow-[#FF6B8A]/30 hover:shadow-[#FF6B8A]/50 transition-shadow"
            title="Add pin at center"
          >
            <Plus className="w-6 h-6 text-white" />
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-20 left-4 right-4 max-w-sm mx-auto rounded-2xl glass shadow-2xl border border-white/10 p-5 z-[1001]"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-white">Drop a Memory Pin</h3>
              <button
                onClick={() => setShowAdd(false)}
                className="p-1.5 rounded-lg hover:bg-white/[0.05] text-white/30"
              >
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
                  onChange={(e) =>
                    setNewPin((p) => ({ ...p, lat: parseFloat(e.target.value) || 0 }))
                  }
                  className="w-full px-4 py-3 rounded-xl bg-white/[0.03] border border-white/10 text-white text-sm placeholder:text-white/20 focus:outline-none focus:border-[#FF6B8A]/40"
                />
                <input
                  type="number"
                  step="any"
                  placeholder="Longitude"
                  value={newPin.lng || ""}
                  onChange={(e) =>
                    setNewPin((p) => ({ ...p, lng: parseFloat(e.target.value) || 0 }))
                  }
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
