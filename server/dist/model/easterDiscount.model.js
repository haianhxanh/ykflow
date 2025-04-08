"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const db_connect_1 = require("../database_connection/db_connect");
class EasterDiscount extends sequelize_1.Model {
}
EasterDiscount.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    discount_type: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    discount_percentage: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
    },
    email: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    discount_code: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
}, {
    sequelize: db_connect_1.db,
    tableName: "easter_discount",
    modelName: "easter_discount",
});
exports.default = EasterDiscount;
