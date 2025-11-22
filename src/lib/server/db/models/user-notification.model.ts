import { Model, DataTypes, type CreationOptional } from "sequelize";
import { sequelize } from "$lib/server/db/instance.js";
import { User } from "./user.model.js";
import { Notification } from "./notification.model.js";

class UserNotification extends Model {
  declare id: number;
  declare notificationId: number;
  declare userId: string;
  // dashboard status
  declare isRead: boolean;
  declare readAt: Date | null;
  // email status
  declare sentViaEmail: boolean;
  declare emailSentAt: Date | null;
  declare emailError: string | null;
  // timestamps
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
}

UserNotification.init(
  {
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    notificationId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: Notification,
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    userId: {
      type: DataTypes.STRING(36),
      allowNull: false,
      references: {
        model: User,
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    isRead: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: false,
    },
    readAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    sentViaEmail: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    emailSentAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    emailError: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Error message if email failed to send',
    },
  },
  {
    sequelize,
    modelName: "UserNotification",
    tableName: "userNotification",
    timestamps: true,
    indexes: [
      {
        fields: ['userId', 'isRead'], // Get unread notifications for a user
      },
      {
        fields: ['notificationId', 'userId'], // Prevent duplicate notifications for same user
        unique: true,
      },
      {
        fields: ['userId', 'createdAt'], // Get notifications chronologically
      },
    ],
  }
);

export { UserNotification };
