import { magicLinkClient } from 'better-auth/client/plugins';
import { createAuthClient } from 'better-auth/svelte';
export const authClient = createAuthClient({
  plugins: [magicLinkClient()]
});

export const { signIn, signUp, useSession } = createAuthClient();
