import { models } from "$lib/server/db/models";
import { redirect } from "@sveltejs/kit";
import type { LayoutServerLoad } from "./$types";

export const load: LayoutServerLoad = async (): Promise<void> => {

  // const attachments = await models.Config.findOne({ where: { key: "attachments" } })
  // const businessHours = await models.Config.findOne({ where: { key: "businesshours" } })
  // const notifications = await models.Config.findOne({ where: { key: "notifications" } })
  // const categories = await models.Category.findAll()
  // const priorities = await models.Priority.findAll()
  //
  // if (!attachments || !businessHours || !notifications || categories.length === 0 || priorities.length === 0) return
  //  redirect(302, '/')
}
