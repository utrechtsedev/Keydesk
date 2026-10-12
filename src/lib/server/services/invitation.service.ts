import { and, eq, gt } from 'drizzle-orm';
import { systemDb, type TenantDb } from '#lib/server/db/database.js';
import * as schema from '#lib/server/db/schema/index.js';
import type { InviteUser } from '#lib/server/db/schema/index.js';
import { sendEmail } from '#lib/server/email/email.js';
import { escapeHtml } from '#lib/server/html.js';
import { logger } from '#lib/server/logger.js';
import { hashPassword } from '#lib/utils/password.js';
import { defaultNotificationPreferences } from './user.service.js';

export const INVITATION_LIFETIME_DAYS = 7;

function newToken(): string {
	return Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url');
}

async function hashToken(token: string): Promise<string> {
	const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
	return Buffer.from(digest).toString('hex');
}

function expiresAt(): Date {
	return new Date(Date.now() + INVITATION_LIFETIME_DAYS * 24 * 60 * 60 * 1000);
}

/**
 * Adds a user without a password to the tenant's organization, with an invitation to set one.
 * Returns the user and the token for the invitation link, or null when the email address already
 * belongs to a user (of any organization: addresses are unique, as signing in looks them up).
 */
export async function inviteUser(
	db: TenantDb,
	values: InviteUser
): Promise<{ user: schema.User; token: string } | null> {
	const [user] = await db
		.insert(schema.user)
		.values({
			...values,
			emailVerified: false,
			banned: false,
			notificationPreferences: defaultNotificationPreferences
		})
		.onConflictDoNothing({ target: schema.user.email })
		.returning();
	if (!user) return null;

	const token = newToken();
	await db
		.insert(schema.invitation)
		.values({ userId: user.id, tokenHash: await hashToken(token), expiresAt: expiresAt() });
	return { user, token };
}

/**
 * Replaces the user's invitation with a new link that works for another full period. Returns the
 * token, or null when the user has no invitation (any more): they have set their password.
 */
export async function renewInvitation(db: TenantDb, userId: number): Promise<string | null> {
	const token = newToken();
	const [renewed] = await db
		.update(schema.invitation)
		.set({ tokenHash: await hashToken(token), expiresAt: expiresAt(), createdAt: new Date() })
		.where(eq(schema.invitation.userId, userId))
		.returning({ id: schema.invitation.id });
	return renewed ? token : null;
}

/** When each open invitation of the tenant's organization expires, by user */
export async function invitationExpiries(db: TenantDb): Promise<Map<number, Date>> {
	const invitations = await db
		.select({ userId: schema.invitation.userId, expiresAt: schema.invitation.expiresAt })
		.from(schema.invitation);
	return new Map(invitations.map((invitation) => [invitation.userId, invitation.expiresAt]));
}

/**
 * Emails the invitation link, through the organization's SMTP settings. Returns whether the email
 * went out; a failure is logged, and the admin gets the link to pass on instead.
 */
export async function sendInvitation(
	db: TenantDb,
	organizationId: number,
	invitation: { name: string; email: string; invitedBy: string; url: string }
): Promise<boolean> {
	const [organization] = await db
		.select({ name: schema.organization.name })
		.from(schema.organization)
		.where(eq(schema.organization.id, organizationId));
	if (!organization) {
		throw new Error(`Organization ${organizationId} not found`);
	}

	const subject = `You're invited to ${organization.name} on Keydesk`;
	const text = [
		`Hi ${invitation.name},`,
		'',
		`${invitation.invitedBy} invited you to ${organization.name} on Keydesk.`,
		`Set your password to sign in: ${invitation.url}`,
		'',
		`The link works for ${INVITATION_LIFETIME_DAYS} days.`
	].join('\n');
	const html = [
		`<p>Hi ${escapeHtml(invitation.name)},</p>`,
		`<p>${escapeHtml(invitation.invitedBy)} invited you to ${escapeHtml(organization.name)} on Keydesk.</p>`,
		`<p><a href="${escapeHtml(invitation.url)}">Set your password</a> to sign in.</p>`,
		`<p>The link works for ${INVITATION_LIFETIME_DAYS} days.</p>`
	].join('\n');

	try {
		await sendEmail(db, organizationId, invitation.email, subject, html, text);
		return true;
	} catch (error) {
		logger.warn(
			{ organizationId, error: error instanceof Error ? error.message : String(error) },
			'Could not send invitation email'
		);
		return false;
	}
}

/**
 * The invited user and organization behind a token, while it is valid. Whoever opens the link
 * isn't signed in, so this looks the token up as the owner.
 */
export async function findInvitation(
	token: string
): Promise<{ name: string; email: string; organizationName: string } | null> {
	const [invitation] = await systemDb
		.select({
			name: schema.user.name,
			email: schema.user.email,
			organizationName: schema.organization.name
		})
		.from(schema.invitation)
		.innerJoin(schema.user, eq(schema.user.id, schema.invitation.userId))
		.innerJoin(schema.organization, eq(schema.organization.id, schema.invitation.organizationId))
		.where(
			and(
				eq(schema.invitation.tokenHash, await hashToken(token)),
				gt(schema.invitation.expiresAt, new Date())
			)
		);
	return invitation ?? null;
}

/**
 * Sets the invited user's password and uses up the invitation; the link reached their inbox, so
 * their email address counts as verified. Returns the address to sign in with, or null when the
 * token isn't valid (any more).
 */
export async function acceptInvitation(token: string, password: string): Promise<string | null> {
	const tokenHash = await hashToken(token);
	const passwordHash = await hashPassword(password);

	return systemDb.transaction(async (tx) => {
		// Deleting claims the invitation, so two submissions of the same link can't both succeed
		const [invitation] = await tx
			.delete(schema.invitation)
			.where(
				and(eq(schema.invitation.tokenHash, tokenHash), gt(schema.invitation.expiresAt, new Date()))
			)
			.returning({ userId: schema.invitation.userId });
		if (!invitation) return null;

		// The same row better-auth creates when a user first sets a password
		await tx.insert(schema.account).values({
			accountId: String(invitation.userId),
			providerId: 'credential',
			userId: invitation.userId,
			password: passwordHash
		});
		const [user] = await tx
			.update(schema.user)
			.set({ emailVerified: true })
			.where(eq(schema.user.id, invitation.userId))
			.returning({ email: schema.user.email });
		return user.email;
	});
}
