import { db } from "$lib/server/db/database";
import * as schema from "$lib/server/db/schema"
import type { LayoutServerLoad } from "../$types";

export const load: LayoutServerLoad = async () => {
  const priorities = await db.select().from(schema.priority)
  const users = await db.select().from(schema.user)
  const statuses = await db.select().from(schema.status)
  const tags = await db.select().from(schema.tag)

  return {
    priorities,
    users,
    statuses,
    tags
  };
};

