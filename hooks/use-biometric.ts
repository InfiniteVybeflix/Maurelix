"use client";

import { useState, useCallback } from "react";

export function useBiometric() {
  const [isSupported, setIsSupported] = useState(() => {
    if (typeof window === "undefined") return false;
    return !!(window.PublicKeyCredential && navigator.credentials);
  });

  const register = useCallback(async (userId: string, userName: string): Promise<{ credentialId: string; success: boolean; error?: string }> => {
    try {
      if (!window.PublicKeyCredential) {
        return { success: false, error: "Biometric authentication not supported on this device", credentialId: "" };
      }

      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const userIdBuffer = new TextEncoder().encode(userId);

      const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions = {
        challenge,
        rp: { name: "Maurelix", id: typeof window !== "undefined" ? window.location.hostname : undefined },
        user: {
          id: userIdBuffer,
          name: userName,
          displayName: userName,
        },
        pubKeyCredParams: [{ alg: -7, type: "public-key" }, { alg: -257, type: "public-key" }],
        authenticatorSelection: {
          authenticatorAttachment: "platform",
          userVerification: "required",
          residentKey: "preferred",
        },
        attestation: "none",
        timeout: 60000,
      };

      const credential = await navigator.credentials.create({ publicKey: publicKeyCredentialCreationOptions });
      if (!credential) {
        return { success: false, error: "Biometric registration cancelled", credentialId: "" };
      }

      const credId = btoa(String.fromCharCode(...new Uint8Array(credential.rawId)));
      return { success: true, credentialId: credId };
    } catch (err: any) {
      return { success: false, error: err.message || "Biometric registration failed", credentialId: "" };
    }
  }, []);

  const authenticate = useCallback(async (credentialId: string): Promise<{ success: boolean; error?: string }> => {
    try {
      if (!window.PublicKeyCredential) {
        return { success: false, error: "Biometric authentication not supported" };
      }

      const challenge = crypto.getRandomValues(new Uint8Array(32));
      const allowCredentials = [{
        id: Uint8Array.from(atob(credentialId), (c) => c.charCodeAt(0)),
        type: "public-key" as const,
      }];

      const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions = {
        challenge,
        allowCredentials,
        userVerification: "required",
        timeout: 60000,
      };

      const assertion = await navigator.credentials.get({ publicKey: publicKeyCredentialRequestOptions });
      if (!assertion) {
        return { success: false, error: "Biometric authentication cancelled" };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "Biometric authentication failed" };
    }
  }, []);

  return { isSupported, register, authenticate };
}
