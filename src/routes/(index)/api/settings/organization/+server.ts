import { db } from "$lib/server/db/database";
import * as schema from "$lib/server/db/schema";
import { ValidationError } from "$lib/server/errors";
import type { Organization } from "$lib/types";
import { json, type RequestHandler } from "@sveltejs/kit";
import { eq } from "drizzle-orm";

export const POST: RequestHandler = async ({ request }): Promise<Response> => {
  const { organization } = await request.json() as { organization: Organization };

  if (!organization)
    throw new ValidationError('Organization data is required')


  if (!organization.name || !organization.domain)
    throw new ValidationError('Organization name and domain are required')

  const [config] = await db
    .insert(schema.config)
    .values({
      key: 'organization',
      value: organization
    })
    .onConflictDoUpdate({
      target: schema.config.key,
      set: {
        value: organization,
        updatedAt: new Date()
      }
    })
    .returning();

  const created = config.createdAt.getTime() === config.updatedAt.getTime();

  return json({
    success: true,
    data: config.value,
    created
  }, { status: created ? 201 : 200 });
};

export const GET: RequestHandler = async () => {
  const [config] = await db
    .select()
    .from(schema.config)
    .where(eq(schema.config.key, 'organization'));

  if (!config) {
    return json({
      success: true,
      data: null,
    });
  }

  return json({
    success: true,
    data: config.value,
  });
};
