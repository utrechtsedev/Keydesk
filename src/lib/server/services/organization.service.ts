import { eq } from 'drizzle-orm';
import type { TenantDb } from '#lib/server/db/database.js';
import * as schema from '#lib/server/db/schema/index.js';
import type { Organization } from '#lib/types/index.js';

/** The settings an admin edits under Settings > Organization */
const settingsColumns = {
	name: schema.organization.name,
	domain: schema.organization.domain,
	address: schema.organization.address,
	country: schema.organization.country,
	city: schema.organization.city,
	zipCode: schema.organization.zipCode,
	language: schema.organization.language,
	timezone: schema.organization.timezone
};

export async function getOrganizationSettings(
	db: TenantDb,
	organizationId: number
): Promise<Organization> {
	const [settings] = await db
		.select(settingsColumns)
		.from(schema.organization)
		.where(eq(schema.organization.id, organizationId));

	if (!settings) {
		throw new Error(`Organization ${organizationId} not found`);
	}
	return settings;
}

export async function updateOrganizationSettings(
	db: TenantDb,
	organizationId: number,
	settings: Organization
): Promise<Organization> {
	const [updated] = await db
		.update(schema.organization)
		.set(settings)
		.where(eq(schema.organization.id, organizationId))
		.returning(settingsColumns);

	if (!updated) {
		throw new Error(`Organization ${organizationId} not found`);
	}
	return updated;
}
