import type { PageServerLoad } from "./$types";
import { db } from "$lib/server/db/database";
import * as schema from "$lib/server/db/schema"
import { eq } from "drizzle-orm";
import type { Holiday } from "$lib/types";

export const load: PageServerLoad = async () => {
  const [config] = await db
    .select()
    .from(schema.config)
    .where(eq(schema.config.key, 'holidays'));

  if (!config) {
    return {
      holidays: null,
    };
  }

  const holidays = (config.value as Holiday[]).map(h => ({
    ...h,
    start: new Date(h.start),
    end: new Date(h.end),
    createdAt: h.createdAt ? new Date(h.createdAt) : undefined,
    updatedAt: h.updatedAt ? new Date(h.updatedAt) : undefined,
  }));

  return {
    holidays,
  };
};
