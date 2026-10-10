import type { Session } from 'better-auth';
import type { User } from '#lib/types/index.js';

declare global {
	namespace App {
		interface Locals {
			user: User | null;
			session: Session | null;
		}
	}
}

export {};
