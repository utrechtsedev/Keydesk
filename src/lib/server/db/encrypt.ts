import crypto from 'crypto';
import { setting } from '#lib/server/settings.js';

const ALGORITHM = 'aes-256-gcm';

export function encrypt(text: string): string {
  if (!text) return '';

  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    ALGORITHM,
    Buffer.from(setting('ENCRYPTION_KEY'), 'hex'),
    iv
  );

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();

  return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
}

export function decrypt(encrypted: string): string {
  if (!encrypted) return '';

  const parts = encrypted.split(':');
  const iv = Buffer.from(parts[0], 'hex');
  const authTag = Buffer.from(parts[1], 'hex');
  const encryptedText = parts[2];

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    Buffer.from(setting('ENCRYPTION_KEY'), 'hex'),

    iv
  );
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
