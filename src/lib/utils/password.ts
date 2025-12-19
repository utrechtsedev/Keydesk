import { scryptAsync } from '@noble/hashes/scrypt.js';

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToBytes(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}

function constantTimeEqual(
  a: ArrayBuffer | Uint8Array,
  b: ArrayBuffer | Uint8Array,
): boolean {
  const aBuffer = new Uint8Array(a);
  const bBuffer = new Uint8Array(b);
  let c = aBuffer.length ^ bBuffer.length;
  const length = Math.max(aBuffer.length, bBuffer.length);
  for (let i = 0; i < length; i++) {
    c |=
      (i < aBuffer.length ? aBuffer[i]! : 0) ^
      (i < bBuffer.length ? bBuffer[i]! : 0);
  }
  return c === 0;
}

const config = {
  N: 16384,
  r: 16,
  p: 1,
  dkLen: 64,
};

async function generateKey(password: string, salt: string) {
  return await scryptAsync(password.normalize('NFKC'), salt, {
    N: config.N,
    p: config.p,
    r: config.r,
    dkLen: config.dkLen,
    maxmem: 128 * config.N * config.r * 2,
  });
}

export const hashPassword = async (password: string) => {
  const salt = bytesToHex(crypto.getRandomValues(new Uint8Array(16)));
  const key = await generateKey(password, salt);
  return `${salt}:${bytesToHex(key)}`;
};

export const verifyPassword = async ({
  hash,
  password,
}: {
  hash: string;
  password: string;
}) => {
  const [salt, key] = hash.split(':');
  if (!salt || !key) {
    throw new Error('Invalid password hash');
  }
  const targetKey = await generateKey(password, salt);
  return constantTimeEqual(targetKey, hexToBytes(key));
};
