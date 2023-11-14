"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.db = void 0;
const sequelize_1 = require("sequelize");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const { DEV_DB_NAME, DEV_DB_USERNAME, DEV_DB_PASSWORD, DEV_DB_HOST } = process.env;
exports.db = new sequelize_1.Sequelize(DEV_DB_NAME, DEV_DB_USERNAME, DEV_DB_PASSWORD, {
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
});
