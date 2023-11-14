"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const db_connect_1 = require("../database_connection/db_connect");
class Inquiry extends sequelize_1.Model {
}
Inquiry.init({
    id: {
        type: sequelize_1.DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
    },
    order_name: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    order_id: {
        type: sequelize_1.DataTypes.BIGINT,
        allowNull: false,
    },
    order_contact: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    pause_start_date: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    pause_end_date: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    item_title: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    new_end_date: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    status: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    request_date: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: false,
    },
}, {
    sequelize: db_connect_1.db,
    tableName: "Request",
    modelName: "Request",
});
exports.default = Inquiry;
