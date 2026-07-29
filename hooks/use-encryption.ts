"use client";

import { useCallback, useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { importPrivateKeyEncrypted, encryptMessage, decryptMessage } from "@/lib/crypto";

export function useEncryption() {
  const [privateKey, setPrivateKey] = useState<CryptoKey | null>(null);
  const [publicKeyJwk, setPublicKeyJwk] = useState<JsonWebKey | null>(null);
  const [partnerKeyJwk, setPartnerKeyJwk] = useState<JsonWebKey | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    let cancelled = false;
    async function init() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) { setLoading(false); return; }
      const { data: deviceKey } = await supabase.from("device_keys").select("*").eq("user_id", user.id).order("last_used_at", { ascending: false }).limit(1).single();
      if (!deviceKey || cancelled) { setLoading(false); return; }
      const session = await supabase.auth.getSession();
      const password = session.data.session?.access_token || user.id;
      const salt = new Uint8Array(16);
      try {
        const pk = await importPrivateKeyEncrypted(deviceKey.encrypted_private_key, password, salt);
        if (!cancelled) {
          setPrivateKey(pk);
          setPublicKeyJwk(JSON.parse(deviceKey.public_key));
        }
      } catch {}
      const { data: profile } = await supabase.from("profiles").select("partner_id").eq("id", user.id).single();
      if (profile?.partner_id) {
        const { data: partnerDevice } = await supabase.from("device_keys").select("public_key").eq("user_id", profile.partner_id).order("last_used_at", { ascending: false }).limit(1).single();
        if (partnerDevice && !cancelled) setPartnerKeyJwk(JSON.parse(partnerDevice.public_key));
      }
      if (!cancelled) setLoading(false);
    }
    init();
    return () => { cancelled = true; };
  }, [supabase]);

  const encrypt = useCallback(async (content: string, forVault = false): Promise<{ encryptedContent: string; encryptedKey: string; nonce: string } | null> => {
    const targetKey = forVault ? publicKeyJwk : partnerKeyJwk;
    if (!targetKey) return null;
    return encryptMessage(content, targetKey);
  }, [publicKeyJwk, partnerKeyJwk]);

  const decrypt = useCallback(async (encryptedContent: string, encryptedKey: string, nonce: string): Promise<string | null> => {
    if (!privateKey) return null;
    try {
      return await decryptMessage(encryptedContent, encryptedKey, nonce, privateKey);
    } catch {
      return null;
    }
  }, [privateKey]);

  return { encrypt, decrypt, loading, hasKeys: !!privateKey };
}
