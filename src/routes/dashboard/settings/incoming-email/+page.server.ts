import type { PageServerLoad } from "./$types";
import { db } from "$lib/server/db/database";
import * as schema from "$lib/server/db/schema"
import { eq } from "drizzle-orm";
import type { IMAP } from "$lib/types";
import { decrypt } from "$lib/server/db/encrypt";

export const load: PageServerLoad = async () => {
  const [config] = await db
    .select()
    .from(schema.config)
    .where(eq(schema.config.key, 'imap'));

  if (!config) {
    return {
      imap: null,
    }
  }

  const response: IMAP = config.value as IMAP;
  response.password = decrypt(response.password);

  return {
    imap: response,
  };
};
