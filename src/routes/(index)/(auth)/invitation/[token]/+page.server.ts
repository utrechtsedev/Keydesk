import { fail, redirect } from '@sveltejs/kit';
import { isAPIError } from 'better-auth/api';
import type { Actions, PageServerLoad } from './$types';
import { getAuth } from '#lib/server/auth.js';
import { passwordSchema } from '#lib/server/db/schema/index.js';
import { acceptInvitation, findInvitation } from '#lib/server/services/invitation.service.js';

export const load: PageServerLoad = async ({ params }) => {
	return { invitation: await findInvitation(params.token) };
};

export const actions: Actions = {
	default: async ({ params, request }) => {
		const form = await request.formData();
		const password = passwordSchema.safeParse(form.get('password'));
		if (!password.success) {
			return fail(400, { message: password.error.issues[0].message });
		}
		if (form.get('confirmation') !== password.data) {
			return fail(400, { message: "The passwords don't match." });
		}

		const email = await acceptInvitation(params.token, password.data);
		if (!email) {
			return fail(410, { message: 'This invitation has expired or has already been used.' });
		}

		// Signs the new user in; better-auth's SvelteKit plugin sets the session cookie
		try {
			await getAuth().api.signInEmail({
				body: { email, password: password.data },
				headers: request.headers
			});
		} catch (error) {
			// Their password is set either way, for instance while an admin has disabled them
			if (!isAPIError(error)) throw error;
			redirect(303, '/login');
		}
		redirect(303, '/dashboard');
	}
};
