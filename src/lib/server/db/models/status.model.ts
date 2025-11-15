import { Model, DataTypes, type CreationOptional, type InferCreationAttributes } from "sequelize";
import { sequelize } from "../instance.js";
import type { Ticket } from "./ticket.model.js";


class Status extends Model {
  declare id: CreationOptional<number>;
  declare name: string;
  declare color: string;
  declare isDefault: boolean;
  declare isClosed: boolean;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  // includes?
  declare statusTickets?: CreationOptional<Ticket[]>
}

export type StatusCreationAttributes = InferCreationAttributes<Status>;

Status.init(
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
    isClosed: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "Status",
    tableName: "status",
    timestamps: true,
  }
);

export { Status };
