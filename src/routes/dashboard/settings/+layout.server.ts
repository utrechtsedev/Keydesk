import { redirect } from "@sveltejs/kit";
import type { LayoutServerLoad } from "../$types";
import { requireAuth } from "$lib/server/auth-helpers";

export const load: LayoutServerLoad = ({ locals }) => {
  const { user } = requireAuth(locals)

  if (user.role !== "admin") redirect(303, '/dashboard')
}
