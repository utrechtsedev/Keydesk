import { Model, DataTypes, type CreationOptional } from "sequelize";
import { sequelize } from "../instance.js";

class Image extends Model {
  declare id: number;
  declare fileName: string;
  declare mimeType: string;
  declare fileData: Buffer;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

Image.init(
  {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    fileName: {
      type: DataTypes.CHAR(255),
      allowNull: false,
    },
    mimeType: {
      type: DataTypes.CHAR(100),
      allowNull: false,
    },
    fileData: {
      type: DataTypes.BLOB,
      allowNull: false
    },
  },
  {
    sequelize,
    modelName: "Image",
    tableName: "image",
    timestamps: true,
  }
);

export { Image };
