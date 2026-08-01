"use client";

// ═══════════════════════════════════════════════════════════════════════════════
//  CORE CRYPTO HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

export async function generateKeyPair(): Promise<{ publicKey: JsonWebKey; privateKey: CryptoKey }> {
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey"]
  );
  const publicKey = await crypto.subtle.exportKey("jwk", keyPair.publicKey);
  return { publicKey, privateKey: keyPair.privateKey };
}

export async function exportPrivateKeyEncrypted(
  privateKey: CryptoKey,
  pin: string,
  salt: Uint8Array
): Promise<string> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(pin),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  const derivedKey = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  );
  const exported = await crypto.subtle.exportKey("jwk", privateKey);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    derivedKey,
    encoder.encode(JSON.stringify(exported))
  );
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  return u8ToB64(combined);
}

export async function importPrivateKeyEncrypted(
  encryptedB64: string,
  pin: string,
  salt: Uint8Array
): Promise<CryptoKey | null> {
  try {
    const encoder = new TextEncoder();
    const combined = b64ToU8(encryptedB64);
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      encoder.encode(pin),
      "PBKDF2",
      false,
      ["deriveKey"]
    );
    const derivedKey = await crypto.subtle.deriveKey(
      { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["decrypt"]
    );
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv as unknown as BufferSource },
      derivedKey,
      ciphertext as unknown as BufferSource
    );
    const jwk = JSON.parse(new TextDecoder().decode(decrypted));
    return crypto.subtle.importKey("jwk", jwk, { name: "ECDH", namedCurve: "P-256" }, true, ["deriveKey"]);
  } catch {
    return null;
  }
}

export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(16));
}

export function generateDeviceFingerprint(): string {
  const raw = [
    navigator.userAgent,
    navigator.language,
    screen.width,
    screen.height,
    new Date().getTimezoneOffset(),
  ].join("|");
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash).toString(16);
}

export function u8ToHex(arr: Uint8Array): string {
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export function hexToU8(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

export function u8ToB64(arr: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < arr.length; i++) {
    bin += String.fromCharCode(arr[i]);
  }
  return btoa(bin);
}

export function b64ToU8(b64: string): Uint8Array {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return bytes;
}

// ═══════════════════════════════════════════════════════════════════════════════
//  E2EE MESSAGE ENCRYPTION / DECRYPTION
// ═══════════════════════════════════════════════════════════════════════════════

export async function encryptMessage(
  content: string,
  targetPublicKeyJwk: JsonWebKey
): Promise<{ encryptedContent: string; encryptedKey: string; nonce: string }> {
  // 1. Generate ephemeral ECDH key pair
  const ephemeral = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveKey"]
  );

  // 2. Import target public key
  const targetPublicKey = await crypto.subtle.importKey(
    "jwk",
    targetPublicKeyJwk,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  // 3. Derive shared secret
  const sharedKey = await crypto.subtle.deriveKey(
    { name: "ECDH", public: targetPublicKey },
    ephemeral.privateKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  );

  // 4. Encrypt content
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    sharedKey,
    encoder.encode(content)
  );

  // 5. Export ephemeral public key to send alongside
  const ephemeralPublicJwk = await crypto.subtle.exportKey("jwk", ephemeral.publicKey);

  return {
    encryptedContent: u8ToB64(new Uint8Array(encrypted)),
    encryptedKey: u8ToB64(new Uint8Array(encoder.encode(JSON.stringify(ephemeralPublicJwk)))),
    nonce: u8ToHex(iv),
  };
}

export async function decryptMessage(
  encryptedContentB64: string,
  encryptedKeyB64: string,
  nonceHex: string,
  privateKey: CryptoKey
): Promise<string> {
  // 1. Decode ephemeral public key
  const ephemeralPublicJwk = JSON.parse(new TextDecoder().decode(b64ToU8(encryptedKeyB64)));

  // 2. Import ephemeral public key
  const ephemeralPublicKey = await crypto.subtle.importKey(
    "jwk",
    ephemeralPublicJwk,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  // 3. Derive shared secret
  const sharedKey = await crypto.subtle.deriveKey(
    { name: "ECDH", public: ephemeralPublicKey },
    privateKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );

  // 4. Decrypt content
  const iv = hexToU8(nonceHex);
  const ciphertext = b64ToU8(encryptedContentB64);

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: iv as unknown as BufferSource },
    sharedKey,
    ciphertext as unknown as BufferSource
  );

  return new TextDecoder().decode(decrypted);
}

// ═══════════════════════════════════════════════════════════════════════════════
//  RECOVERY & SECURITY QUESTION HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

export async function hashAnswer(answer: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(answer.toLowerCase().trim());
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function exportPrivateKeyWithPassword(
  privateKey: CryptoKey,
  password: string,
  salt: Uint8Array
): Promise<string> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );
  const derivedKey = await crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  );
  const exported = await crypto.subtle.exportKey("jwk", privateKey);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    derivedKey,
    encoder.encode(JSON.stringify(exported))
  );
  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);
  return u8ToB64(combined);
}

export async function importPrivateKeyWithPassword(
  encryptedB64: string,
  password: string,
  salt: Uint8Array
): Promise<CryptoKey | null> {
  try {
    const encoder = new TextEncoder();
    const combined = b64ToU8(encryptedB64);
    const iv = combined.slice(0, 12);
    const ciphertext = combined.slice(12);
    const keyMaterial = await crypto.subtle.importKey(
      "raw",
      encoder.encode(password),
      "PBKDF2",
      false,
      ["deriveKey"]
    );
    const derivedKey = await crypto.subtle.deriveKey(
      { name: "PBKDF2", salt, iterations: 100000, hash: "SHA-256" },
      keyMaterial,
      { name: "AES-GCM", length: 256 },
      false,
      ["decrypt"]
    );
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: iv as unknown as BufferSource },
      derivedKey,
      ciphertext as unknown as BufferSource
    );
    const jwk = JSON.parse(new TextDecoder().decode(decrypted));
    return crypto.subtle.importKey("jwk", jwk, { name: "ECDH", namedCurve: "P-256" }, true, ["deriveKey"]);
  } catch {
    return null;
  }
}
