import { describe, expect, it } from 'vitest';
import { requiredAccess } from './access.js';

describe('requiredAccess', () => {
	it.each([
		['/(index)/(auth)/login', 'GET', 'public'],
		['/(index)/(auth)/invitation/[token]', 'POST', 'public'],
		['/(index)/api/settings/users', 'POST', 'admin'],
		['/(index)/logo', 'GET', 'user'],
		['/(index)/logo', 'POST', 'admin'],
		['/(index)/api/settings/outgoing-email', 'GET', 'admin'],
		['/dashboard/settings', 'GET', 'admin'],
		['/dashboard/settings/users/[id]/account', 'GET', 'admin'],
		['/(index)/api/tickets', 'POST', 'user'],
		['/dashboard/tickets/[id]', 'GET', 'user'],
		// A route nobody has classified stays closed
		['/(index)/api/something-new', 'DELETE', 'user']
	])('%s %s needs %s', (routeId, method, access) => {
		expect(requiredAccess(routeId, method)).toBe(access);
	});
});
