import { Model, DataTypes, type CreationOptional } from "sequelize";
import { sequelize } from "$lib/server/db/instance.js";
import { Ticket } from "./ticket.model.js";
import { User } from "./user.model.js";
import { Requester } from "./requester.model.js";

class TicketMessage extends Model {
  declare id: number;
  declare ticketId: number;
  // who sent this message
  declare senderType: "requester" | "user" | "system";
  declare requesterId: number | null;
  declare senderName: string | null;
  declare senderEmail: string | null;
  declare userId: string | null;
  // message content
  declare message: string;
  declare isPrivate: boolean;
  // message metadata
  declare channel: "email" | "portal" | "system" | "api";
  declare isFirstResponse: boolean;
  // attachments
  declare hasAttachments: boolean;
  // Timestamps
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

TicketMessage.init(
  {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    ticketId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Ticket,
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    senderType: {
      type: DataTypes.ENUM("requester", "user", "system"),
      allowNull: false,
    },
    requesterId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: Requester,
        key: 'id'
      }
    },
    senderName: {
      type: DataTypes.STRING(100),
      allowNull: true,
    },
    senderEmail: {
      type: DataTypes.STRING(255),
      allowNull: true,
    },
    userId: {
      type: DataTypes.STRING(36),
      allowNull: true,
      references: {
        model: User,
        key: 'id'
      }
    },
    message: {
      type: DataTypes.TEXT('medium'),
      allowNull: false,
    },
    isPrivate: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    channel: {
      type: DataTypes.ENUM("email", "portal", "system", "api", "dashboard"),
      allowNull: false,
    },
    isFirstResponse: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
    hasAttachments: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "TicketMessage",
    tableName: "ticketMessage",
    timestamps: true,
    indexes: [
      {
        fields: ['ticketId', 'createdAt'], // chronological message retrieval
      },
      {
        fields: ['senderType', 'requesterId'], // user activity tracking
      },
      {
        fields: ['senderType', 'userId'], // user activity tracking
      },
    ],
  }
);

export { TicketMessage };
