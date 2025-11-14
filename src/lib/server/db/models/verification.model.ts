import { Model, DataTypes, type CreationOptional } from "sequelize";
import { sequelize } from "../instance.js";

class Verification extends Model {
  declare id: string;
  declare identifier: string;
  declare value: string;
  declare expiresAt: Date;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Verification.init(
  {
    id: {
      type: DataTypes.STRING(36),
      allowNull: false,
      primaryKey: true,
    },
    identifier: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    value: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    expiresAt: {
      type: DataTypes.DATE(3), // timestamp(3)
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "Verification",
    tableName: "verification",
    timestamps: true,
  }
);

export { Verification };
