import type { User as BetterAuthUser, Session } from 'better-auth';
import { redirect } from '@sveltejs/kit';

interface User extends Omit<BetterAuthUser, 'id'> {
	id: number;
	role?: string;
}

export function requireAuth(locals: App.Locals): { user: User; session: Session } {
	if (!locals.user || !locals.session) {
		redirect(302, '/login');
	}

	return {
		user: locals.user,
		session: locals.session
	};
}
