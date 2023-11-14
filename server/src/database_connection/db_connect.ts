import { Sequelize } from "sequelize";
import dotenv from "dotenv";

dotenv.config();

const { DEV_DB_NAME, DEV_DB_USERNAME, DEV_DB_PASSWORD, DEV_DB_HOST } =
  process.env;

export const db = new Sequelize(
  DEV_DB_NAME!,
  DEV_DB_USERNAME!,
  DEV_DB_PASSWORD!,

  {
    host: DEV_DB_HOST,
    port: 5432,
    dialect: "postgres",
    logging: false,
    define: {
      timestamps: true,
    },
    dialectOptions: {
      encrypt: true,
      ssl: {
        rejectUnauthorized: true,
      },
    },
  }
);
