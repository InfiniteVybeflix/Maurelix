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
    { name: "PBKDF2", salt: salt as BufferSource, iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  );
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv as BufferSource }, aesKey, raw);
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  let binary = "";
  for (let i = 0; i < combined.length; i++) {
    binary += String.fromCharCode(combined[i]);
  }
  return btoa(binary);
}

export async function importPrivateKeyEncrypted(encryptedB64: string, password: string, salt: Uint8Array): Promise<CryptoKey> {
  const binary = atob(encryptedB64);
  const combined = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    combined[i] = binary.charCodeAt(i);
  }
  const iv = combined.slice(0, 12);
  const ciphertext = combined.slice(12);
  const keyMaterial = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveKey"]);
  const aesKey = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as BufferSource, iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv as BufferSource }, aesKey, ciphertext);
  return crypto.subtle.importKey("pkcs8", decrypted, { name: "RSA-OAEP", hash: "SHA-256" }, true, ["decrypt"]);
}

export async function encryptMessage(content: string, recipientPublicKeyJwk: JsonWebKey): Promise<{ encryptedContent: string; encryptedKey: string; nonce: string }> {
  const symKey = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt", "decrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(content);
  const encryptedContent = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv as BufferSource }, symKey, encoded);

  const publicKey = await crypto.subtle.importKey("jwk", recipientPublicKeyJwk, { name: "RSA-OAEP", hash: "SHA-256" }, false, ["encrypt"]);
  const rawSymKey = await crypto.subtle.exportKey("raw", symKey);
  const encryptedKey = await crypto.subtle.encrypt({ name: "RSA-OAEP" }, publicKey, rawSymKey);

  function u8ToB64(arr: Uint8Array): string {
    let b = "";
    for (let i = 0; i < arr.length; i++) b += String.fromCharCode(arr[i]);
    return btoa(b);
  }
  return {
    encryptedContent: u8ToB64(new Uint8Array(encryptedContent)),
    encryptedKey: u8ToB64(new Uint8Array(encryptedKey)),
    nonce: u8ToB64(iv),
  };
}

export async function decryptMessage(encryptedContent: string, encryptedKey: string, nonce: string, privateKey: CryptoKey): Promise<string> {
  function b64ToU8(b64: string): Uint8Array {
    const b = atob(b64);
    const arr = new Uint8Array(b.length);
    for (let i = 0; i < b.length; i++) arr[i] = b.charCodeAt(i);
    return arr;
  }
  const symKeyRaw = await crypto.subtle.decrypt({ name: "RSA-OAEP" }, privateKey, b64ToU8(encryptedKey));
  const symKey = await crypto.subtle.importKey("raw", symKeyRaw, { name: "AES-GCM", length: 256 }, false, ["decrypt"]);
  const iv = b64ToU8(nonce);
  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv: iv as BufferSource }, symKey, b64ToU8(encryptedContent));
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
