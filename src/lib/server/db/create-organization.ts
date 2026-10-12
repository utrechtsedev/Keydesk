import { randomBytes } from 'node:crypto';
import { parseArgs } from 'node:util';
import { eq } from 'drizzle-orm';
import { connect, databaseUrl, disconnect, withTenant, type SystemDb } from './database.js';
import * as schema from './schema/index.js';
import { createOrganizationDefaults } from './initialize.js';
import { hashPassword } from '../../utils/password.js';
import { defaultNotificationPreferences } from '../services/user.service.js';

/**
 * Creates an organization with its default settings and its first admin, and prints a generated
 * password for that admin once.
 *
 * Usage: bun run org:create --name "Klant BV" --admin-email jan@klant.nl --admin-name "Jan Jansen"
 */
async function main(): Promise<void> {
	const systemDb = connect(databaseUrl());
	try {
		await createOrganization(systemDb);
	} finally {
		await disconnect(systemDb);
	}
}

async function createOrganization(systemDb: SystemDb): Promise<void> {
	const { values } = parseArgs({
		options: {
			name: { type: 'string' },
			'admin-email': { type: 'string' },
			'admin-name': { type: 'string' }
		}
	});
	const name = values.name?.trim();
	const adminEmail = values['admin-email']?.trim().toLowerCase();
	const adminName = values['admin-name']?.trim();
	if (!name || !adminEmail || !adminName) {
		throw new Error(
			'Usage: bun run org:create --name "Klant BV" --admin-email jan@klant.nl --admin-name "Jan Jansen"'
		);
	}

	const password = randomBytes(18).toString('base64url');

	// A tenant transaction runs on its own connection and can't see uncommitted rows of another
	// transaction, so the organization is committed first and removed again if a later step fails
	const [organization] = await systemDb.insert(schema.organization).values({ name }).returning();
	let admin: schema.User;
	try {
		admin = await withTenant(systemDb, organization.id, async (db) => {
			await createOrganizationDefaults(db, () => {});
			const [admin] = await db
				.insert(schema.user)
				.values({
					name: adminName,
					email: adminEmail,
					emailVerified: true,
					role: 'admin',
					notificationPreferences: defaultNotificationPreferences
				})
				.returning();
			return admin;
		});

		// better-auth's tables are outside the tenant role's reach, so the password is set here
		await systemDb.insert(schema.account).values({
			accountId: String(admin.id),
			providerId: 'credential',
			userId: admin.id,
			password: await hashPassword(password)
		});
	} catch (error) {
		// Deleting the organization deletes everything created for it
		await systemDb.delete(schema.organization).where(eq(schema.organization.id, organization.id));
		throw error;
	}

	console.log(`Created ${organization.name} (organization ${organization.id})`);
	console.log(
		`Its admin ${admin.email} can sign in with this password, shown only now: ${password}`
	);
}

main()
	.then(() => process.exit(0))
	.catch((error: Error) => {
		console.error(error.message);
		process.exit(1);
	});
