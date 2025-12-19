// See https://svelte.dev/docs/kit/types#app.d.ts
import type { Session, User as BetterAuthUser } from 'better-auth';

interface User extends Omit<BetterAuthUser, 'id'> {
  id: number;
  role?: string;
}
// for information about these interfaces
declare global {
  namespace App {
    // interface Error {}
    interface Locals {
      user: User | null,
      session: Session | null
    }
    // interface PageData {}
    // interface PageState {}
    // interface Platform {}
  }
}

export { };


