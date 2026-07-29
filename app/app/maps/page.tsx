"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MemoryPin, Profile } from "@/types";
import { ArrowLeft, MapPin, Plus, X, Lock, Navigation } from "lucide-react";

export default function MapsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [user, setUser] = useState<Profile | null>(null);
  const [coupleId, setCoupleId] = useState<string | null>(null);
  const [pins, setPins] = useState<MemoryPin[]>([]);
  const [userPos, setUserPos] = useState<{ lat: number; lng: number } | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newPin, setNewPin] = useState({ title: "", note: "", radius: 50 });
  const [selectedPin, setSelectedPin] = useState<MemoryPin | null>(null);
  const [visitedTiles, setVisitedTiles] = useState<Set<string>>(new Set());

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user: authUser } }) => {
      if (!authUser) { router.push("/"); return; }
      supabase.from("profiles").select("*").eq("id", authUser.id).single().then(({ data }) => {
        if (data) setUser(data);
      });
      supabase.from("couples").select("id").or(`user_a_id.eq.${authUser.id},user_b_id.eq.${authUser.id}`).single().then(({ data }) => {
        if (data) {
          setCoupleId(data.id);
          loadPins(data.id);
        }
      });
    });

    const saved = localStorage.getItem("maurelix-visited-tiles");
    if (saved) setVisitedTiles(new Set(JSON.parse(saved)));

    if (navigator.geolocation) {
      navigator.geolocation.watchPosition((pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserPos({ lat, lng });
        const tileKey = `${Math.floor(lat * 100)},${Math.floor(lng * 100)}`;
        setVisitedTiles((prev) => {
          if (prev.has(tileKey)) return prev;
          const next = new Set(prev);
          next.add(tileKey);
          localStorage.setItem("maurelix-visited-tiles", JSON.stringify(Array.from(next)));
          return next;
        });
        checkGeofence(lat, lng);
      }, () => {}, { enableHighAccuracy: true });
    }
  }, [router, supabase]);

  const loadPins = async (cid: string) => {
    const { data } = await supabase.from("memory_pins").select("*").eq("couple_id", cid);
    if (data) setPins(data);
  };

  const checkGeofence = (lat: number, lng: number) => {
    pins.forEach((pin) => {
      if (pin.unlocked_at) return;
      const dist = haversine(lat, lng, pin.lat, pin.lng);
      if (dist < pin.unlock_radius_meters) {
        supabase.from("memory_pins").update({ unlocked_at: new Date().toISOString() }).eq("id", pin.id).then(() => {
          supabase.from("notifications").insert({
            user_id: user?.id,
            type: "memory_unlock",
            title: "Memory Unlocked",
            body: `You unlocked: ${pin.title}`,
            data: { pin_id: pin.id },
          });
          loadPins(coupleId!);
        });
      }
    });
  };

  const haversine = (lat1: number, lng1: number, lat2: number, lng2: number) => {
    const R = 6371e3;
    const toRad = (x: number) => (x * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  const addPin = async () => {
    if (!coupleId || !userPos) return;
    const { data } = await supabase.from("memory_pins").insert({
      couple_id: coupleId,
      creator_id: user?.id,
      lat: userPos.lat,
      lng: userPos.lng,
      title: newPin.title,
      content_encrypted: newPin.note,
      unlock_radius_meters: newPin.radius,
    }).select().single();
    if (data) {
      setPins((prev) => [...prev, data]);
      setShowAdd(false);
      setNewPin({ title: "", note: "", radius: 50 });
    }
  };

  const mapUrl = userPos
    ? `https://www.openstreetmap.org/export/embed.html?bbox=${userPos.lng - 0.01}%2C${userPos.lat - 0.01}%2C${userPos.lng + 0.01}%2C${userPos.lat + 0.01}&layer=mapnik&marker=${userPos.lat}%2C${userPos.lng}`
    : "https://www.openstreetmap.org/export/embed.html?bbox=-0.1%2C-0.1%2C0.1%2C0.1&layer=mapnik";

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col">
      <header className="px-4 py-3 border-b border-[var(--border)] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={() => router.push("/app/chat")} className="p-2 rounded-full hover:bg-[var(--muted)] transition"><ArrowLeft className="w-5 h-5" /></button>
          <h1 className="text-lg font-bold">Memory Map</h1>
        </div>
        <button onClick={() => setShowAdd(true)} className="p-2 rounded-full bg-[var(--accent)] text-white hover:opacity-90 transition"><Plus className="w-5 h-5" /></button>
      </header>

      <div className="flex-1 relative">
        <iframe src={mapUrl} className="w-full h-full border-0" title="Map" />
        {userPos && (
          <div className="absolute bottom-4 right-4 bg-[var(--card)] border border-[var(--border)] rounded-xl px-3 py-2 shadow-lg text-xs">
            <div className="flex items-center gap-1 text-[var(--muted-foreground)]"><Navigation className="w-3 h-3" /> {userPos.lat.toFixed(4)}, {userPos.lng.toFixed(4)}</div>
          </div>
        )}
        {pins.map((pin) => (
          <button key={pin.id} onClick={() => setSelectedPin(pin)}
            className="absolute w-8 h-8 -ml-4 -mt-8 flex items-center justify-center"
            style={{ left: "50%", top: "50%" }}>
            <MapPin className={`w-6 h-6 ${pin.unlocked_at ? "text-[var(--accent)]" : "text-[var(--muted-foreground)]"}`} />
          </button>
        ))}
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end">
          <div className="w-full bg-[var(--card)] rounded-t-2xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold">Drop Memory Pin</h3>
              <button onClick={() => setShowAdd(false)} className="p-1 rounded-full hover:bg-[var(--muted)] transition"><X className="w-4 h-4" /></button>
            </div>
            <input placeholder="Title" value={newPin.title} onChange={(e) => setNewPin({ ...newPin, title: e.target.value })}
              className="w-full px-4 py-3 rounded-xl bg-[var(--background)] border border-[var(--border)] text-sm focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" />
            <textarea placeholder="Note (encrypted)" value={newPin.note} onChange={(e) => setNewPin({ ...newPin, note: e.target.value })} rows={2}
              className="w-full px-4 py-3 rounded-xl bg-[var(--background)] border border-[var(--border)] text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[var(--accent)]" />
            <div>
              <label className="text-[10px] text-[var(--muted-foreground)]">Unlock radius: {newPin.radius}m</label>
              <input type="range" min={10} max={500} value={newPin.radius} onChange={(e) => setNewPin({ ...newPin, radius: parseInt(e.target.value) })} className="w-full accent-[var(--accent)]" />
            </div>
            <button onClick={addPin} disabled={!newPin.title}
              className="w-full py-3 rounded-xl bg-[var(--accent)] text-white text-sm font-medium hover:opacity-90 transition disabled:opacity-50">Drop Pin</button>
          </div>
        </div>
      )}

      {selectedPin && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[var(--card)] rounded-2xl p-6 max-w-sm w-full">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold">{selectedPin.title}</h3>
              <button onClick={() => setSelectedPin(null)} className="p-1 rounded-full hover:bg-[var(--muted)] transition"><X className="w-4 h-4" /></button>
            </div>
            {selectedPin.unlocked_at ? (
              <p className="text-xs text-[var(--muted-foreground)]">{selectedPin.content_encrypted}</p>
            ) : (
              <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                <Lock className="w-4 h-4" /> Get within {selectedPin.unlock_radius_meters}m to unlock
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
