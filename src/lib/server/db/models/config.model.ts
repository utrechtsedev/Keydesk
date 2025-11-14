import { Model, DataTypes, type CreationOptional } from "sequelize";
import { sequelize } from "../instance.js";

class Config extends Model {
  declare id: number;
  declare key: string;
  declare value: any;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Config.init(
  {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    key: {
      type: DataTypes.TEXT,
      unique: true,
      allowNull: false,
    },
    value: {
      type: DataTypes.JSON,
      allowNull: true,
    }
  },
  {
    sequelize,
    modelName: "Config",
    tableName: "config",
    timestamps: true,
  }
);

export { Config };
