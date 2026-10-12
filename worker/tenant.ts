import { withTenant, type TenantDb } from '#lib/server/db/database.js';

/**
 * Until mailboxes arrive, this worker reads one IMAP inbox for one organization: the one in
 * ORGANIZATION_ID.
 */
export function workerOrganizationId(): number {
	const organizationId = Number(process.env.ORGANIZATION_ID);
	if (!Number.isInteger(organizationId) || organizationId <= 0) {
		throw new Error('Set ORGANIZATION_ID to the organization whose inbox this worker reads');
	}
	return organizationId;
}

/** Runs database work in a tenant transaction of the worker's organization */
export function inOrganization<T>(work: (db: TenantDb) => Promise<T>): Promise<T> {
	return withTenant(workerOrganizationId(), work);
}
