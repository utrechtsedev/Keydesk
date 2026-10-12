type Required = 'APP_URL' | 'BETTER_AUTH_SECRET' | 'DATABASE_URL' | 'ENCRYPTION_KEY';

/** Settings for connecting Microsoft 365 and Gmail mailboxes; without them, that option is off */
type Optional =
	'MICROSOFT_CLIENT_ID' | 'MICROSOFT_CLIENT_SECRET' | 'GOOGLE_CLIENT_ID' | 'GOOGLE_CLIENT_SECRET';

/**
 * A setting from the environment: on Workers the vars and secrets (which `nodejs_compat` puts in
 * process.env), in Node the process environment. A missing setting throws, so it can't turn into
 * wrong links or empty passwords.
 */
export function setting(name: Required | Optional): string {
	const value = process.env[name];
	if (!value) {
		throw new Error(`${name} is not set.`);
	}
	return value;
}

/** A setting that turns a feature on, or null when it isn't set */
export function optionalSetting(name: Optional): string | null {
	return process.env[name] || null;
}
