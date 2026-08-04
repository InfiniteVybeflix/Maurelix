"use client";

import { useState, useCallback, useEffect } from "react";

function u8ToB64(arr: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < arr.length; i++) {
    bin += String.fromCharCode(arr[i]);
  }
  return btoa(bin);
}

function b64ToU8(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return bytes;
}

function getRpId(): string | undefined {
  if (typeof window === "undefined") return undefined;
  const hostname = window.location.hostname;
  // WebAuthn requires a valid domain. localhost works on some browsers
  // only with specific flags. IP addresses generally fail.
  // Omit rp.id to let the browser default to the origin (most compatible).
  if (hostname === "localhost" || hostname === "127.0.0.1" || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
    return undefined;
  }
  return hostname;
}

export function useBiometric() {
  const [isSupported, setIsSupported] = useState(false);
  const [isPlatformAvailable, setIsPlatformAvailable] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const checkSupport = async () => {
      const hasApi = !!(window.PublicKeyCredential && navigator.credentials);
      if (!hasApi) {
        setIsSupported(false);
        setChecked(true);
        return;
      }

      // Check secure context — WebAuthn requires HTTPS
      if (!window.isSecureContext) {
        console.warn("[Biometric] Not in secure context (HTTPS required)");
        setIsSupported(false);
        setChecked(true);
        return;
      }

      setIsSupported(true);

      // Check if platform authenticator is available
      try {
        const available = await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
        setIsPlatformAvailable(available);
      } catch {
        setIsPlatformAvailable(false);
      }
      setChecked(true);
    };

    checkSupport();
  }, []);

  const register = useCallback(
    async (
      userId: string,
      userName: string
    ): Promise<{
      credentialId: string;
      success: boolean;
      error?: string;
    }> => {
      try {
        if (typeof window === "undefined" || !window.PublicKeyCredential) {
          return {
            success: false,
            error: "Biometric authentication is not supported on this device/browser.",
            credentialId: "",
          };
        }

        if (!window.isSecureContext) {
          return {
            success: false,
            error: "Biometric auth requires a secure connection (HTTPS). Please access this site via https:// or deploy to a hosting platform with SSL.",
            credentialId: "",
          };
        }

        const challenge = crypto.getRandomValues(new Uint8Array(32));
        const userIdBuffer = new TextEncoder().encode(userId);
        const rpId = getRpId();

        const publicKeyCredentialCreationOptions: PublicKeyCredentialCreationOptions =
          {
            challenge,
            rp: {
              name: "Maurelix",
              id: rpId,
            },
            user: {
              id: userIdBuffer,
              name: userName,
              displayName: userName,
            },
            pubKeyCredParams: [
              { alg: -7, type: "public-key" },
              { alg: -257, type: "public-key" },
            ],
            authenticatorSelection: {
              // Allow both platform and cross-platform authenticators
              // "platform" = TouchID/FaceID/Windows Hello only
              // undefined = any available authenticator
              authenticatorAttachment: undefined,
              userVerification: "required",
              residentKey: "preferred",
            },
            attestation: "none",
            timeout: 60000,
          };

        const credential = await navigator.credentials.create({
          publicKey: publicKeyCredentialCreationOptions,
        });

        if (!credential) {
          return {
            success: false,
            error: "Biometric registration was cancelled.",
            credentialId: "",
          };
        }

        const pkCred = credential as PublicKeyCredential;
        const credId = u8ToB64(new Uint8Array(pkCred.rawId));
        return { success: true, credentialId: credId };
      } catch (err: any) {
        console.error("[Biometric Register] Error:", err);
        let message = err.message || "Biometric registration failed.";

        // Translate common WebAuthn errors into human-friendly messages
        if (err.name === "NotAllowedError") {
          message =
            "Permission denied. Biometric registration was blocked. Ensure you are on HTTPS and have granted permission.";
        } else if (err.name === "SecurityError") {
          message =
            "Security error: the origin does not match the expected domain for biometric auth.";
        } else if (err.name === "AbortError") {
          message = "Biometric registration was cancelled.";
        } else if (err.name === "NotSupportedError") {
          message =
            "No compatible biometric authenticator found on this device.";
        } else if (err.name === "InvalidStateError") {
          message =
            "A credential already exists for this account. Please remove it from your device settings first.";
        } else if (message.includes("credential manager")) {
          message =
            "Your browser's credential manager could not complete the request. Try using HTTPS, a different browser, or ensure your device has biometric hardware enabled.";
        }

        return { success: false, error: message, credentialId: "" };
      }
    },
    []
  );

  const authenticate = useCallback(
    async (credentialId: string): Promise<{ success: boolean; error?: string }> => {
      try {
        if (typeof window === "undefined" || !window.PublicKeyCredential) {
          return {
            success: false,
            error: "Biometric authentication not supported.",
          };
        }

        if (!window.isSecureContext) {
          return {
            success: false,
            error: "Biometric auth requires HTTPS.",
          };
        }

        const challenge = crypto.getRandomValues(new Uint8Array(32));
        const allowCredentials: PublicKeyCredentialDescriptor[] = [
          {
            id: b64ToU8(credentialId) as unknown as ArrayBuffer,
            type: "public-key",
          },
        ];

        const publicKeyCredentialRequestOptions: PublicKeyCredentialRequestOptions =
          {
            challenge,
            allowCredentials,
            userVerification: "required",
            timeout: 60000,
          };

        const assertion = await navigator.credentials.get({
          publicKey: publicKeyCredentialRequestOptions,
        });

        if (!assertion) {
          return {
            success: false,
            error: "Biometric authentication was cancelled.",
          };
        }

        return { success: true };
      } catch (err: any) {
        console.error("[Biometric Authenticate] Error:", err);
        let message = err.message || "Biometric authentication failed.";

        if (err.name === "NotAllowedError") {
          message = "Permission denied. Please try again and allow biometric access.";
        } else if (err.name === "SecurityError") {
          message = "Security error: origin mismatch.";
        } else if (err.name === "AbortError") {
          message = "Authentication was cancelled.";
        } else if (err.name === "NotSupportedError") {
          message = "This credential is no longer available on this device.";
        }

        return { success: false, error: message };
      }
    },
    []
  );

  return { isSupported, isPlatformAvailable, checked, register, authenticate };
}
