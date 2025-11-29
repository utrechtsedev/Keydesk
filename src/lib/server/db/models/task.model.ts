import { Model, DataTypes, type CreationOptional, type NonAttribute } from "sequelize";
import { sequelize } from "$lib/server/db/instance.js";
import { User } from "./user.model.js";
import { Ticket } from "./ticket.model.js";
import { Status } from "./status.model.js";
import { Priority } from "./priority.model.js";
import type { Tag } from "./tag.model.js";
import {
  type BelongsToManyGetAssociationsMixin,
  type BelongsToManyAddAssociationMixin,
  type BelongsToManyAddAssociationsMixin,
  type BelongsToManySetAssociationsMixin,
  type BelongsToManyRemoveAssociationMixin,
  type BelongsToManyRemoveAssociationsMixin,
  type BelongsToManyHasAssociationMixin,
  type BelongsToManyHasAssociationsMixin,
  type BelongsToManyCountAssociationsMixin,
  type HasManyGetAssociationsMixin,
  type HasManyAddAssociationMixin,
  type HasManyAddAssociationsMixin,
  type HasManySetAssociationsMixin,
  type HasManyRemoveAssociationMixin,
  type HasManyRemoveAssociationsMixin,
  type HasManyHasAssociationMixin,
  type HasManyHasAssociationsMixin,
  type HasManyCountAssociationsMixin,
} from 'sequelize';

class Task extends Model {
  declare id: number;

  // Basic info
  declare title: string;
  declare description: string | null;

  // Relationships
  declare ticketId: number | null; // null = standalone task
  declare parentTaskId: number | null; // null = root task
  declare createdById: string; // User who created it

  // Classification
  declare statusId: number;
  declare priorityId: number;

  // Timing
  declare dueDate: Date;
  declare startDate: Date | null;
  declare completedAt: Date | null;

  // Tracking
  declare position: number; // For manual ordering

  // Timestamps
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  // Assignee association methods (many-to-many)
  declare getAssignees: BelongsToManyGetAssociationsMixin<User>;
  declare addAssignee: BelongsToManyAddAssociationMixin<User, string>;
  declare addAssignees: BelongsToManyAddAssociationsMixin<User, string>;
  declare setAssignees: BelongsToManySetAssociationsMixin<User, string>;
  declare removeAssignee: BelongsToManyRemoveAssociationMixin<User, string>;
  declare removeAssignees: BelongsToManyRemoveAssociationsMixin<User, string>;
  declare hasAssignee: BelongsToManyHasAssociationMixin<User, string>;
  declare hasAssignees: BelongsToManyHasAssociationsMixin<User, string>;
  declare countAssignees: BelongsToManyCountAssociationsMixin;

  // Subtask association methods (one-to-many, self-referencing)
  declare getSubtasks: HasManyGetAssociationsMixin<Task>;
  declare addSubtask: HasManyAddAssociationMixin<Task, number>;
  declare addSubtasks: HasManyAddAssociationsMixin<Task, number>;
  declare setSubtasks: HasManySetAssociationsMixin<Task, number>;
  declare removeSubtask: HasManyRemoveAssociationMixin<Task, number>;
  declare removeSubtasks: HasManyRemoveAssociationsMixin<Task, number>;
  declare hasSubtask: HasManyHasAssociationMixin<Task, number>;
  declare hasSubtasks: HasManyHasAssociationsMixin<Task, number>;
  declare countSubtasks: HasManyCountAssociationsMixin;

  // Tag association methods (many-to-many)
  declare getTags: BelongsToManyGetAssociationsMixin<Tag>;
  declare addTag: BelongsToManyAddAssociationMixin<Tag, number>;
  declare addTags: BelongsToManyAddAssociationsMixin<Tag, number>;
  declare setTags: BelongsToManySetAssociationsMixin<Tag, number>;
  declare removeTag: BelongsToManyRemoveAssociationMixin<Tag, number>;
  declare removeTags: BelongsToManyRemoveAssociationsMixin<Tag, number>;
  declare hasTag: BelongsToManyHasAssociationMixin<Tag, number>;
  declare hasTags: BelongsToManyHasAssociationsMixin<Tag, number>;
  declare countTags: BelongsToManyCountAssociationsMixin;

  // Virtual associations
  declare assignees?: NonAttribute<User[]>;
  declare subtasks?: NonAttribute<Task[]>;
  declare parentTask?: NonAttribute<Task>;
  declare ticket?: NonAttribute<Ticket>;
  declare creator?: NonAttribute<User>;
  declare status?: NonAttribute<Status>;
  declare priority?: NonAttribute<Priority>;
  declare tags?: NonAttribute<Tag[]>;
}

Task.init(
  {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    title: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    ticketId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: Ticket,
        key: 'id',
      },
    },
    parentTaskId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'task', // Self-reference
        key: 'id',
      },
    },
    createdById: {
      type: DataTypes.STRING(36),
      allowNull: false,
      references: {
        model: User,
        key: 'id',
      },
    },
    statusId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Status,
        key: 'id',
      },
    },
    priorityId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Priority,
        key: 'id',
      },
    },
    dueDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    startDate: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    position: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    sequelize,
    modelName: "Task",
    tableName: "task",
    timestamps: true,
    paranoid: true,
  }
);

export { Task };
