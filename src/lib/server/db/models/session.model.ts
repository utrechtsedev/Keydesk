import { Model, DataTypes, type CreationOptional } from "sequelize";
import { sequelize } from "../instance.js";

class Session extends Model {
  declare id: string;
  declare expiresAt: Date;
  declare token: string;
  declare ipAddress: string | null;
  declare userAgent: string | null;
  declare userId: string;
  declare impersonatedBy: string | null;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Session.init(
  {
    id: {
      type: DataTypes.STRING(36),
      allowNull: false,
      primaryKey: true,
    },
    expiresAt: {
      type: DataTypes.DATE(3), // timestamp(3)
      allowNull: false,
    },
    token: {
      type: DataTypes.STRING(255), // varchar(255)
      allowNull: false,
      unique: true, // UNIQUE constraint
    },
    ipAddress: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    userId: {
      type: DataTypes.STRING(36),
      allowNull: false,
    },
    impersonatedBy: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "Session",
    tableName: "session",
    timestamps: true,
    indexes: [
      {
        fields: ['userId'] // KEY `userId`
      }
    ]
  }
);

export { Session };
