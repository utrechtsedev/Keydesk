import { Sequelize } from "sequelize";
import "dotenv/config"
const { DATABASE_NAME, DATABASE_USERNAME, DATABASE_PASSWORD, DATABASE_HOST } = process.env;

if (!DATABASE_NAME || !DATABASE_USERNAME || !DATABASE_PASSWORD) {
  console.error("Database environment variables are not set in your .env file.");
  process.exit(1);
}
export const sequelize = new Sequelize(DATABASE_NAME, DATABASE_USERNAME, DATABASE_PASSWORD, {
  dialect: "mariadb",
  host: DATABASE_HOST ?? 'localhost',
  logging: false,
  timezone: '+02:00',
});
