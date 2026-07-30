"use client";

import { useCallback, useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  importPrivateKeyEncrypted,
  encryptMessage,
  decryptMessage,
  generateSalt,
  u8ToHex,
  hexToU8,
} from "@/lib/crypto";

export function useEncryption() {
  const [privateKey, setPrivateKey] = useState<CryptoKey | null>(null);
  const [publicKeyJwk, setPublicKeyJwk] = useState<JsonWebKey | null>(null);
  const [partnerKeyJwk, setPartnerKeyJwk] = useState<JsonWebKey | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user || cancelled) {
          setLoading(false);
          return;
        }

        const { data: deviceKey } = await supabase
          .from("device_keys")
          .select("*")
          .eq("user_id", user.id)
          .order("last_used_at", { ascending: false })
          .limit(1)
          .single();

        if (!deviceKey || cancelled) {
          setLoading(false);
          return;
        }

        // Retrieve the user PIN from sessionStorage (set during onboarding)
        const pin = sessionStorage.getItem("maurelix_pin");
        if (!pin) {
          setError("PIN not set. Please re-authenticate.");
          setLoading(false);
          return;
        }

        const salt = hexToU8(deviceKey.encryption_salt || "0".repeat(32));
        const pk = await importPrivateKeyEncrypted(
          deviceKey.encrypted_private_key,
          pin,
          salt
        );

        if (!cancelled) {
          setPrivateKey(pk);
          setPublicKeyJwk(JSON.parse(deviceKey.public_key));
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("partner_id")
          .eq("id", user.id)
          .single();

        if (profile?.partner_id) {
          const { data: partnerDevice } = await supabase
            .from("device_keys")
            .select("public_key")
            .eq("user_id", profile.partner_id)
            .order("last_used_at", { ascending: false })
            .limit(1)
            .single();

          if (partnerDevice && !cancelled) {
            setPartnerKeyJwk(JSON.parse(partnerDevice.public_key));
          }
        }
      } catch (err) {
        console.error("Encryption init error:", err);
        if (!cancelled) setError("Failed to initialize encryption");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    init();
    return () => { cancelled = true; };
  }, [supabase]);

  const encrypt = useCallback(
    async (
      content: string,
      forVault = false
    ): Promise<{ encryptedContent: string; encryptedKey: string; nonce: string } | null> => {
      const targetKey = forVault ? publicKeyJwk : partnerKeyJwk;
      if (!targetKey) return null;
      try {
        return await encryptMessage(content, targetKey);
      } catch (err) {
        console.error("Encrypt error:", err);
        return null;
      }
    },
    [publicKeyJwk, partnerKeyJwk]
  );

  const decrypt = useCallback(
    async (
      encryptedContent: string,
      encryptedKey: string,
      nonce: string
    ): Promise<string | null> => {
      if (!privateKey) return null;
      try {
        return await decryptMessage(encryptedContent, encryptedKey, nonce, privateKey);
      } catch (err) {
        console.error("Decrypt error:", err);
        return null;
      }
    },
    [privateKey]
  );

  return { encrypt, decrypt, loading, error, hasKeys: !!privateKey };
}
