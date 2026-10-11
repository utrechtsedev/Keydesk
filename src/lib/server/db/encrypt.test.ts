import { describe, expect, it } from 'vitest';
import { decrypt, encrypt } from './encrypt.js';

describe('encrypt', () => {
	it('round-trips a value', () => {
		expect(decrypt(encrypt('smtp-password'))).toBe('smtp-password');
	});

	it('uses a fresh IV, so the same input encrypts differently', () => {
		expect(encrypt('same input')).not.toBe(encrypt('same input'));
	});

	it('rejects a tampered ciphertext', () => {
		const [iv, authTag, ciphertext] = encrypt('secret').split(':');
		const tampered = (ciphertext[0] === 'a' ? 'b' : 'a') + ciphertext.slice(1);

		expect(() => decrypt([iv, authTag, tampered].join(':'))).toThrow();
	});
});
