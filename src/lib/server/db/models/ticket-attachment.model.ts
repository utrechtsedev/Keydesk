import { Model, DataTypes, type CreationOptional } from "sequelize";
import { sequelize } from "$lib/server/db/instance.js";
import { Ticket } from "./ticket.model.js";
import { TicketMessage } from "./ticket-message.model.js";

class TicketAttachment extends Model {
  declare id: number;
  declare ticketId: number;
  declare messageId: number | null;

  // file information
  declare fileName: string;
  declare originalFileName: string;
  declare filePath: string;
  declare fileSize: number;
  declare mimeType: string;

  // upload tracking uploaded_by_type
  declare uploadedByType: "requester" | "user";
  declare uploadedById: string;
  declare uploadedByName: string;

  // optional metadata
  declare downloadCount: number;

  // timestamps
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

TicketAttachment.init(
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
    messageId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: TicketMessage,
        key: 'id',
      },
      onDelete: 'SET NULL', // Keep attachment even if message deleted
    },
    fileName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Stored filename (may be hashed/unique)',
    },
    originalFileName: {
      type: DataTypes.STRING(255),
      allowNull: false,
      comment: 'Original filename from upload',
    },
    filePath: {
      type: DataTypes.STRING(500),
      allowNull: false,
      comment: 'Relative path or full S3/cloud URL',
    },
    fileSize: {
      type: DataTypes.INTEGER,
      allowNull: false,
      comment: 'File size in bytes',
    },
    mimeType: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'MIME type (e.g., image/png, application/pdf)',
    },
    uploadedByType: {
      type: DataTypes.ENUM("requester", "user"),
      allowNull: false,
    },
    uploadedById: {
      type: DataTypes.STRING(36),
      allowNull: false,
      comment: 'User ID (agent) or Requester ID',
    },
    uploadedByName: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    downloadCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false,
    },
  },
  {
    sequelize,
    modelName: "TicketAttachment",
    tableName: "ticketAttachment",
    timestamps: true,
    indexes: [
      {
        fields: ['ticketId'], // get all attachments for a ticket
      },
      {
        fields: ['messageId'], // get attachments for a specific message
      },
    ],
  }
);

export { TicketAttachment };
