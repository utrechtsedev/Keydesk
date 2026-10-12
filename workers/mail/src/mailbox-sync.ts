import { DurableObject } from 'cloudflare:workers';
import { connect, disconnect } from '#lib/server/db/database.js';
import { syncMailbox } from '#lib/server/mail/sync.js';

interface Target {
	organizationId: number;
	mailboxId: number;
}

/**
 * Syncs one mailbox: its alarm reads the mailbox, then sets itself for the next sync. A Durable
 * Object runs one alarm at a time, so a mailbox is never synced twice at once; when an alarm fails
 * unexpectedly, Cloudflare retries it.
 */
export class MailboxSync extends DurableObject<Env> {
	/** Syncs the mailbox now, and from then on every poll interval */
	async schedule(target: Target): Promise<void> {
		await this.ctx.storage.put('target', target);
		await this.ctx.storage.setAlarm(Date.now());
	}

	async alarm(): Promise<void> {
		const target = await this.ctx.storage.get<Target>('target');
		if (!target) return;

		const systemDb = connect(this.env.HYPERDRIVE.connectionString);
		try {
			const next = await syncMailbox(systemDb, target.organizationId, target.mailboxId);
			if (next) {
				await this.ctx.storage.setAlarm(next.getTime());
			} else {
				// The mailbox is gone or switched off; enabling it again schedules it anew
				await this.ctx.storage.deleteAll();
			}
		} finally {
			await disconnect(systemDb);
		}
	}
}

/** The Durable Object of a mailbox */
export function mailboxSync(env: Env, mailboxId: number) {
	return env.MAILBOX_SYNC.get(env.MAILBOX_SYNC.idFromName(String(mailboxId)));
}
