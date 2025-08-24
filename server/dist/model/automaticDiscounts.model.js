"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const db_connect_1 = require("../database_connection/db_connect");
class AutomaticDiscounts extends sequelize_1.Model {
}
AutomaticDiscounts.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    gid: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    }
}, {
    sequelize: db_connect_1.db,
    tableName: "AutomaticDiscounts",
    modelName: "AutomaticDiscounts",
});
exports.default = AutomaticDiscounts;
