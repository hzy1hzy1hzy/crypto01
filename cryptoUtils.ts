
/**
 * ECC File Encryption Logic (ECIES-like):
 * 1. Generate an ephemeral P-256 key pair.
 * 2. Derive a shared secret using Ephemeral Private Key + Recipient Public Key.
 * 3. Use the shared secret (passed through KDF) to encrypt the file with AES-GCM.
 * 4. Bundle: [Ephemeral Public Key (Raw)] + [IV (12 bytes)] + [CipherText].
 */

const CURVE = 'P-256';

export async function generateECCKeyPair(): Promise<{ publicKey: string; privateKey: string }> {
  const keyPair = await window.crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: CURVE },
    true,
    ['deriveKey', 'deriveBits']
  );

  const pubExport = await window.crypto.subtle.exportKey('spki', keyPair.publicKey);
  const privExport = await window.crypto.subtle.exportKey('pkcs8', keyPair.privateKey);

  return {
    publicKey: b64Encode(pubExport),
    privateKey: b64Encode(privExport)
  };
}

export async function encryptFile(
  file: File,
  recipientPublicKeyB64: string
): Promise<Blob> {
  const recipientPublicKey = await window.crypto.subtle.importKey(
    'spki',
    b64Decode(recipientPublicKeyB64),
    { name: 'ECDH', namedCurve: CURVE },
    false,
    []
  );

  // 1. Generate ephemeral key
  const ephemeralKeyPair = await window.crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: CURVE },
    true,
    ['deriveKey']
  );

  // 2. Derive Shared Secret (AES-GCM 256 key)
  const aesKey = await window.crypto.subtle.deriveKey(
    { name: 'ECDH', public: recipientPublicKey },
    ephemeralKeyPair.privateKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt']
  );

  // 3. Encrypt file content
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const fileData = await file.arrayBuffer();
  const cipherText = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    fileData
  );

  // 4. Export ephemeral public key to include in the bundle
  const ephPubRaw = await window.crypto.subtle.exportKey('raw', ephemeralKeyPair.publicKey);

  // Bundle: [EphPub Size(1)] + [EphPub] + [IV] + [CipherText]
  const bundle = new Uint8Array(1 + ephPubRaw.byteLength + iv.byteLength + cipherText.byteLength);
  bundle[0] = ephPubRaw.byteLength;
  bundle.set(new Uint8Array(ephPubRaw), 1);
  bundle.set(iv, 1 + ephPubRaw.byteLength);
  bundle.set(new Uint8Array(cipherText), 1 + ephPubRaw.byteLength + iv.byteLength);

  return new Blob([bundle], { type: 'application/octet-stream' });
}

export async function decryptFile(
  encryptedData: ArrayBuffer,
  recipientPrivateKeyB64: string
): Promise<ArrayBuffer> {
  const recipientPrivateKey = await window.crypto.subtle.importKey(
    'pkcs8',
    b64Decode(recipientPrivateKeyB64),
    { name: 'ECDH', namedCurve: CURVE },
    false,
    ['deriveKey']
  );

  const bundle = new Uint8Array(encryptedData);
  const ephPubSize = bundle[0];
  const ephPubRaw = bundle.slice(1, 1 + ephPubSize);
  const iv = bundle.slice(1 + ephPubSize, 1 + ephPubSize + 12);
  const cipherText = bundle.slice(1 + ephPubSize + 12);

  const ephemeralPublicKey = await window.crypto.subtle.importKey(
    'raw',
    ephPubRaw,
    { name: 'ECDH', namedCurve: CURVE },
    false,
    []
  );

  const aesKey = await window.crypto.subtle.deriveKey(
    { name: 'ECDH', public: ephemeralPublicKey },
    recipientPrivateKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['decrypt']
  );

  return await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    aesKey,
    cipherText
  );
}

// Helpers
function b64Encode(buf: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}

function b64Decode(str: string): Uint8Array {
  const binary = atob(str);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}
