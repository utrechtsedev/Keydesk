import type { User as BetterAuthUser, Session } from 'better-auth';
import { UnauthorizedError } from './errors';

interface User extends Omit<BetterAuthUser, 'id'> {
  id: number;
  role?: string;
}

export function requireAuth(locals: App.Locals): { user: User; session: Session } {
  if (!locals.user || !locals.session) {
    throw new UnauthorizedError();
  }

  return {
    user: locals.user,
    session: locals.session
  };
}
