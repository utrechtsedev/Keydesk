import { Model, DataTypes, type CreationOptional } from "sequelize";
import { sequelize } from "../instance.js";
import { User } from "./user.model.js";

class Account extends Model {
  declare id: string;
  declare accountId: string;
  declare providerId: string;
  declare userId: string;
  declare accessToken: string | null;
  declare refreshToken: string | null;
  declare idToken: string | null;
  declare accessTokenExpiresAt: Date | null;
  declare refreshTokenExpiresAt: Date | null;
  declare scope: string | null;
  declare password: string | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Account.init(
  {
    id: {
      type: DataTypes.STRING(36),
      allowNull: false,
      primaryKey: true,
    },
    accountId: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    providerId: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    userId: {
      type: DataTypes.STRING(36),
      allowNull: false,
      references: {
        model: User,
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    accessToken: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    refreshToken: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    idToken: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    accessTokenExpiresAt: {
      type: DataTypes.DATE(3),
      allowNull: true,
    },
    refreshTokenExpiresAt: {
      type: DataTypes.DATE(3),
      allowNull: true,
    },
    scope: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    password: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "Account",
    tableName: "account",
    timestamps: true,
  }
);

export { Account };
