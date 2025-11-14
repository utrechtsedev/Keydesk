import { Model, DataTypes, type CreationOptional } from "sequelize";
import { sequelize } from "$lib/server/db/instance.js";
import { Requester } from "./requester.model.js";
import { User } from "./user.model.js";
import { Status } from "./status.model.js";
import { Priority } from "./priority.model.js";
import { Category } from "./category.model.js";
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
  type NonAttribute
} from 'sequelize';
class Ticket extends Model {
  declare id: number;
  declare ticketNumber: string;
  // requester section
  declare requesterId: number;
  // assignment and ownership
  declare assignedUserId: string | null;
  // ticket content
  declare subject: string;
  declare channel: "email" | "portal" | "user";
  // classification
  declare statusId: number;
  declare priorityId: number;
  declare categoryId: number;
  // timing
  declare firstResponseAt: Date | null;
  declare resolvedAt: Date | null;
  declare closedAt: Date | null;
  declare targetDate: Date;
  // workflow and tracking
  declare lastUserResponseAt: Date | null;
  declare lastRequesterResponseAt: Date | null;
  declare responseCount: number;
  // timestamps
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

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
  declare tags?: NonAttribute<Tag[]>;
  declare category: NonAttribute<Category>;
  declare status?: NonAttribute<Status>;
  declare priority?: NonAttribute<Priority>;
  declare requester?: NonAttribute<Requester>;
  declare assignedUser?: NonAttribute<User>
}

Ticket.init(
  {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    ticketNumber: {
      type: DataTypes.STRING(10),
      allowNull: false,
    },
    // requester section. to have less database traffic, i add requester information in this table too
    requesterId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Requester,
        key: 'id',
      },
    },
    // assignment and ownership
    assignedUserId: {
      type: DataTypes.STRING(36),
      allowNull: true,
      references: {
        model: User,
        key: 'id',
      },
    },
    // ticket content
    subject: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    channel: {
      type: DataTypes.ENUM("email", "portal", "user"),
      allowNull: false,
    },
    // classification
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
    categoryId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Category,
        key: 'id',
      },
    },
    // timing & sla
    firstResponseAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    resolvedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    closedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    targetDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    // workflow and tracking
    lastUserResponseAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    lastRequesterResponseAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    responseCount: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "Ticket",
    tableName: "ticket",
    timestamps: true,
    paranoid: true,
  }
);

export { Ticket };
