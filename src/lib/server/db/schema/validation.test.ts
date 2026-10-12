import { describe, expect, it } from 'vitest';
import { smtpSettingsSchema } from './validation.js';

describe('smtpSettingsSchema', () => {
	const smtp = {
		senderName: 'Keydesk',
		senderEmail: 'helpdesk@keydesk.test',
		host: 'smtp.example.com',
		SSL: false,
		enableAuthentication: true,
		username: 'helpdesk',
		password: 'secret'
	};

	it.each([25, 465, 587, 2525])('accepts port %i', (port) => {
		expect(smtpSettingsSchema.safeParse({ ...smtp, port }).success).toBe(true);
	});

	it.each([0, 65536, 587.5])('rejects port %s', (port) => {
		expect(smtpSettingsSchema.safeParse({ ...smtp, port }).success).toBe(false);
	});
});
