type Name = 'APP_URL' | 'BETTER_AUTH_SECRET' | 'DATABASE_URL' | 'ENCRYPTION_KEY';

/**
 * A setting from the environment: on Workers the vars and secrets in wrangler.jsonc (which
 * `nodejs_compat` puts in process.env), in Node the process environment. A missing setting throws,
 * so it can't turn into wrong links or empty passwords.
 */
export function setting(name: Name): string {
	const value = process.env[name];
	if (!value) {
		throw new Error(`${name} is not set.`);
	}
	return value;
}
