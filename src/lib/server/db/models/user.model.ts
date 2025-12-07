import { Model, DataTypes, type CreationOptional } from "sequelize";
import { sequelize } from "../instance.js";
import type { NotificationPreferences } from "$lib/types/core.js";

class User extends Model {
  declare id: string;
  declare name: string;
  declare email: string;
  declare emailVerified: boolean;
  declare image: CreationOptional<string | null>;
  declare role: CreationOptional<string | null>;
  declare banned: CreationOptional<boolean | null>;
  declare banReason: CreationOptional<string | null>;
  declare banExpires: CreationOptional<Date | null>
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare notificationPreferences: CreationOptional<NotificationPreferences | null>
}

User.init(
  {
    id: {
      type: DataTypes.STRING(36),
      allowNull: false,
      primaryKey: true,
    },
    name: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: false,
      unique: true,
    },
    emailVerified: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
    image: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    role: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    banned: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    banReason: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    banExpires: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    notificationPreferences: {
      type: DataTypes.JSON,
      allowNull: true
    }
  },
  {
    sequelize,
    modelName: "User",
    tableName: "user",
    timestamps: true,
  }
);

export { User };
