import { Model, DataTypes, type CreationOptional } from "sequelize";
import { sequelize } from "../instance.js";

class Priority extends Model {
  declare id: number;
  declare name: string;
  declare color: string;
  declare isDefault: boolean;
  declare order: number;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Priority.init(
  {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING(50),
      allowNull: false,
    },
    color: {
      type: DataTypes.STRING(7),
      allowNull: false,
    },
    isDefault: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
    order: {
      type: DataTypes.INTEGER({ length: 1 }),
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "Priority",
    tableName: "priority",
    timestamps: true,
  }
);

export { Priority };
