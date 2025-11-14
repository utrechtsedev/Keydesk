import { Model, DataTypes, type CreationOptional } from "sequelize";
import { sequelize } from "$lib/server/db/instance.js";
import { User } from "./user.model.js";
import type { UserNotification } from "./user-notification.model.js";
import { Ticket } from "./ticket.model.js";
import {
  type HasManyGetAssociationsMixin,
  type HasManyAddAssociationMixin,
  type HasManyAddAssociationsMixin,
  type HasManySetAssociationsMixin,
  type HasManyRemoveAssociationMixin,
  type HasManyRemoveAssociationsMixin,
  type HasManyHasAssociationMixin,
  type HasManyHasAssociationsMixin,
  type HasManyCountAssociationsMixin,
  type NonAttribute
} from 'sequelize';

class Notification extends Model {
  declare id: number;
  declare title: string;
  declare message: string;

  // notification type
  declare type: "info" | "success" | "warning" | "error" | "ticket" | "system";

  // delivery channels
  declare channels: string[]; // ["dashboard", "email"] ["dashboard"] ["email"]

  // optional: link to related entity
  declare relatedEntityType: "ticket" | "user" | "system" | null;
  declare relatedEntityId: number | null;
  declare actionUrl: string | null;

  // who created this notification
  declare createdById: string | null;

  // timestamps
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;

  // Association methods for UserNotification
  declare getUserNotifications: HasManyGetAssociationsMixin<UserNotification>;
  declare addUserNotification: HasManyAddAssociationMixin<UserNotification, number>;
  declare addUserNotifications: HasManyAddAssociationsMixin<UserNotification, number>;
  declare setUserNotifications: HasManySetAssociationsMixin<UserNotification, number>;
  declare removeUserNotification: HasManyRemoveAssociationMixin<UserNotification, number>;
  declare removeUserNotifications: HasManyRemoveAssociationsMixin<UserNotification, number>;
  declare hasUserNotification: HasManyHasAssociationMixin<UserNotification, number>;
  declare hasUserNotifications: HasManyHasAssociationsMixin<UserNotification, number>;
  declare countUserNotifications: HasManyCountAssociationsMixin;

  declare userNotifications?: NonAttribute<UserNotification[]>;
  declare creator?: NonAttribute<User>;
  declare relatedTicket?: NonAttribute<Ticket>;
}

Notification.init(
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
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    type: {
      type: DataTypes.ENUM("info", "success", "warning", "error", "ticket", "system"),
      allowNull: false,
      defaultValue: "info",
    },
    channels: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: ["dashboard"],
      comment: 'Array of channels: ["dashboard", "email"]',
    },
    relatedEntityType: {
      type: DataTypes.ENUM("ticket", "user", "system"),
      allowNull: true,
    },
    relatedEntityId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'ID of the related entity (e.g., ticket ID)',
    },
    actionUrl: {
      type: DataTypes.STRING(500),
      allowNull: true,
      comment: 'Optional URL for action button or link',
    },
    createdById: {
      type: DataTypes.STRING(36),
      allowNull: true,
      references: {
        model: User,
        key: 'id',
      },
      comment: 'User who created this notification (null for system)',
    },
  },
  {
    sequelize,
    modelName: "Notification",
    tableName: "notification",
    timestamps: true,
  }
);

export { Notification };
