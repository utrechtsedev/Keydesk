import { requireAuth } from '$lib/server/auth-helper';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = ({ locals }) => {
	requireAuth(locals);
	redirect(308, '/dashboard');
};
