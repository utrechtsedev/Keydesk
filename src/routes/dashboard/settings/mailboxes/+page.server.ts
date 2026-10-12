import type { PageServerLoad } from './$types';
import { requireAuth } from '#lib/server/auth.js';
import { listMailboxes } from '#lib/server/mail/mailboxes.js';

export const load: PageServerLoad = async ({ locals, depends }) => {
	const { db } = requireAuth(locals);
	depends('app:mailboxes');
	return { mailboxes: await listMailboxes(db) };
};
