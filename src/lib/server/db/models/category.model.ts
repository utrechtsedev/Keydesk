import { Model, DataTypes, type CreationOptional, type InferCreationAttributes } from "sequelize";
import { sequelize } from "../instance.js";

class Category extends Model {
  declare id: CreationOptional<number>;
  declare name: string;
  declare description: string;
  declare prefix: string;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

export type CategoryCreationAttributes = InferCreationAttributes<Category>;

Category.init(
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
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    prefix: {
      type: DataTypes.STRING(5),
      allowNull: true,
    },
  },
  {
    sequelize,
    modelName: "Category",
    tableName: "category",
    timestamps: true,
  }
);

export { Category };
