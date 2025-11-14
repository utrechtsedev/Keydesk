import { error, redirect } from "@sveltejs/kit";
import type { LayoutServerLoad } from "../$types";

export const load: LayoutServerLoad = ({ locals }) => {
  if (!locals.user) return error(401, "Unauthorized")

  if (locals.user.role !== "admin") redirect(303, '/dashboard')
}
