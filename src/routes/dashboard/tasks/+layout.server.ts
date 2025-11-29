import { Category, Priority, Status, Tag, User } from "$lib/server/db/models";
import type { LayoutServerLoad } from "../$types";

export const load: LayoutServerLoad = async () => {
  const priorities = await Priority.findAll()
  const users = await User.findAll()
  const statuses = await Status.findAll()
  const categories = await Category.findAll()
  const tags = await Tag.findAll()

  return {
    priorities: priorities.map(p => p.toJSON()),
    users: users.map(u => u.toJSON()),
    statuses: statuses.map(s => s.toJSON()),
    categories: categories.map(c => c.toJSON()),
    tags: tags.map(t => t.toJSON())
  };
};
