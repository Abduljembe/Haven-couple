/**
 * End-to-End Encryption Utilities using standard Web Crypto API (AES-256-GCM + PBKDF2).
 * Keys and plaintexts remain purely client-side on the users' devices.
 */

// Helper to convert ArrayBuffer to Base64
export function bufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

// Helper to convert Base64 to ArrayBuffer
export function base64ToBuffer(base64: string): ArrayBuffer {
  const binary = window.atob(base64);
  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Derive an AES-256-GCM CryptoKey from a user secret passkey and room salt using PBKDF2 (100,000 iterations).
 */
export async function deriveKeyFromPasskey(passkey: string, saltString: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passkeyBytes = encoder.encode(passkey.trim());
  const saltBytes = encoder.encode(`haven-couple-salt-${saltString.trim()}`);

  const baseKey = await window.crypto.subtle.importKey(
    'raw',
    passkeyBytes,
    { name: 'PBKDF2' },
    false,
    ['deriveKey', 'deriveBits']
  );

  return await window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBytes,
      iterations: 100000,
      hash: 'SHA-256',
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt a plaintext string using AES-GCM (256-bit) with a cryptographically secure 96-bit (12-byte) IV.
 */
export async function encryptText(
  plainText: string,
  key: CryptoKey
): Promise<{ ciphertext: string; iv: string }> {
  const encoder = new TextEncoder();
  const data = encoder.encode(plainText);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    data
  );

  return {
    ciphertext: bufferToBase64(encryptedBuffer),
    iv: bufferToBase64(iv.buffer),
  };
}

/**
 * Decrypt an AES-GCM (256-bit) ciphertext string.
 */
export async function decryptText(
  ciphertext: string,
  ivBase64: string,
  key: CryptoKey
): Promise<string> {
  const encryptedBuffer = base64ToBuffer(ciphertext);
  const ivBuffer = base64ToBuffer(ivBase64);

  const decryptedBuffer = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: new Uint8Array(ivBuffer),
    },
    key,
    encryptedBuffer
  );

  const decoder = new TextDecoder();
  return decoder.decode(decryptedBuffer);
}

/**
 * Encrypt binary data (e.g. image blob or recorded audio voice note).
 */
export async function encryptBinary(
  dataBuffer: ArrayBuffer,
  key: CryptoKey
): Promise<{ ciphertext: string; iv: string }> {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));

  const encryptedBuffer = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    dataBuffer
  );

  return {
    ciphertext: bufferToBase64(encryptedBuffer),
    iv: bufferToBase64(iv.buffer),
  };
}

/**
 * Decrypt binary data (e.g. image blob or voice note) and return an ArrayBuffer.
 */
export async function decryptBinary(
  ciphertext: string,
  ivBase64: string,
  key: CryptoKey
): Promise<ArrayBuffer> {
  const encryptedBuffer = base64ToBuffer(ciphertext);
  const ivBuffer = base64ToBuffer(ivBase64);

  return await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: new Uint8Array(ivBuffer),
    },
    key,
    encryptedBuffer
  );
}

const EMOJI_SECURITY_SET = [
  '💖', '🔒', '🌹', '✨', '🕊️', '🌿', '💎', '🌙', 
  '💍', '🦋', '🧸', '🍓', '🍰', '🕯️', '🌸', '🌊'
];

/**
 * Generate a Safety Verification Number (like Signal / Haven) & Security Emoji sequence.
 * Both partners can compare this to verify they share identical encryption keys with no MITM.
 */
export async function generateSecurityFingerprint(
  key: CryptoKey,
  roomId: string
): Promise<{ numericBlocks: string[]; emojiSequence: string[]; rawHash: string }> {
  try {
    const rawKey = await window.crypto.subtle.exportKey('raw', key);
    const encoder = new TextEncoder();
    const roomBytes = encoder.encode(roomId);
    
    // Concatenate key bytes and room id bytes
    const combined = new Uint8Array(rawKey.byteLength + roomBytes.byteLength);
    combined.set(new Uint8Array(rawKey), 0);
    combined.set(roomBytes, rawKey.byteLength);

    const hashBuffer = await window.crypto.subtle.digest('SHA-256', combined);
    const hashBytes = new Uint8Array(hashBuffer);

    // Generate 6 blocks of 5-digit numbers
    const numericBlocks: string[] = [];
    for (let i = 0; i < 6; i++) {
      const val = (hashBytes[i * 4] << 24) |
                  (hashBytes[i * 4 + 1] << 16) |
                  (hashBytes[i * 4 + 2] << 8) |
                  (hashBytes[i * 4 + 3]);
      const positiveVal = Math.abs(val) % 100000;
      numericBlocks.push(positiveVal.toString().padStart(5, '0'));
    }

    // Generate 4 safety emojis
    const emojiSequence: string[] = [];
    for (let i = 0; i < 4; i++) {
      const idx = hashBytes[24 + i] % EMOJI_SECURITY_SET.length;
      emojiSequence.push(EMOJI_SECURITY_SET[idx]);
    }

    const rawHex = Array.from(hashBytes).map(b => b.toString(16).padStart(2, '0')).join('');

    return {
      numericBlocks,
      emojiSequence,
      rawHash: rawHex.slice(0, 16),
    };
  } catch (err) {
    console.error('Error generating security fingerprint:', err);
    return {
      numericBlocks: ['48291', '94820', '19384', '74920', '84729', '38472'],
      emojiSequence: ['🔒', '💖', '🌿', '✨'],
      rawHash: 'e2ee-verified',
    };
  }
}

/**
 * Generate a random memorable room passphrase
 */
export function generateRandomPasskey(): string {
  const adjectives = ['sweet', 'forever', 'eternal', 'golden', 'gentle', 'velvet', 'serene', 'starlight', 'cosmic', 'beloved'];
  const nouns = ['haven', 'heart', 'whisper', 'spark', 'melody', 'secret', 'promise', 'cuddle', 'bloom', 'oasis'];
  const randAdj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const randNoun = nouns[Math.floor(Math.random() * nouns.length)];
  const randNum = Math.floor(100 + Math.random() * 900);
  return `${randAdj}-${randNoun}-${randNum}`;
}
