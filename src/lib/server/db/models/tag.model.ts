import { Model, DataTypes, type CreationOptional } from "sequelize";
import { sequelize } from "../instance.js";

class Tag extends Model {
  declare id: number;
  declare name: string;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Tag.init(
  {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true
    },
    name: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "Tag",
    tableName: "tag",
    timestamps: true,
  }
);

export { Tag };
