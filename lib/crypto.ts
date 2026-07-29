"use client";

export async function generateKeyPair(): Promise<{ publicKey: JsonWebKey; privateKey: CryptoKey }> {
  const pair = await crypto.subtle.generateKey(
    { name: "RSA-OAEP", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" },
    true,
    ["encrypt", "decrypt"]
  );
  const publicKey = await crypto.subtle.exportKey("jwk", pair.publicKey);
  return { publicKey, privateKey: pair.privateKey };
}

export async function exportPrivateKeyEncrypted(privateKey: CryptoKey, password: string, salt: Uint8Array): Promise<string> {
  const raw = await crypto.subtle.exportKey("pkcs8", privateKey);
  const keyMaterial = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
  const aesKey = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, aesKey, raw);
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  return btoa(String.fromCharCode(...combined));
}

export async function importPrivateKeyEncrypted(encryptedB64: string, password: string, salt: Uint8Array): Promise<CryptoKey> {
  const combined = Uint8Array.from(atob(encryptedB64), (c) => c.charCodeAt(0));
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  const keyMaterial = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
  const aesKey = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, aesKey, ciphertext);
  return crypto.subtle.importKey("pkcs8", decrypted, { name: "RSA-OAEP", hash: "SHA-256" }, true, ["decrypt"]);
}

export async function encryptMessage(content: string, recipientPublicKeyJwk: JsonWebKey): Promise<{ encryptedContent: string; encryptedKey: string; nonce: string }> {
  const symKey = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(content);
  const encryptedContent = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, symKey, encoded);

  const publicKey = await crypto.subtle.importKey("jwk", recipientPublicKeyJwk, { name: "RSA-OAEP", hash: "SHA-256" }, false, ["encrypt"]);
  const rawSymKey = await crypto.subtle.exportKey("raw", symKey);
  const encryptedKey = await crypto.subtle.encrypt({ name: "RSA-OAEP" }, publicKey, rawSymKey);

  return {
    encryptedContent: btoa(String.fromCharCode(...new Uint8Array(encryptedContent))),
    encryptedKey: btoa(String.fromCharCode(...new Uint8Array(encryptedKey))),
    nonce: btoa(String.fromCharCode(...iv)),
  };
}

export async function decryptMessage(encryptedContent: string, encryptedKey: string, nonce: string, privateKey: CryptoKey): Promise<string> {
  const symKeyRaw = await crypto.subtle.decrypt({ name: "RSA-OAEP" }, privateKey, Uint8Array.from(atob(encryptedKey), (c) => c.charCodeAt(0)));
  const symKey = await crypto.subtle.importKey("raw", symKeyRaw, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
  const iv = Uint8Array.from(atob(nonce), (c) => c.charCodeAt(0));
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, symKey, Uint8Array.from(atob(encryptedContent), (c) => c.charCodeAt(0)));
  return new TextDecoder().decode(decrypted);
}

export function generateDeviceFingerprint(): string {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.textBaseline = "top";
    ctx.font = "14px Arial";
    ctx.fillText("Maurelix fingerprint", 2, 2);
  }
  const data = canvas.toDataURL();
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    hash = (hash << 5) - hash + data.charCodeAt(i);
    hash |= 0;
  }
  return `fp_${Math.abs(hash).toString(16)}_${navigator.userAgent.slice(0, 20)}`;
}
