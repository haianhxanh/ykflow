"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const db_connect_1 = require("../database_connection/db_connect");
class Recipe extends sequelize_1.Model {
}
Recipe.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    name: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: false,
    },
    type: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
    },
}, {
    sequelize: db_connect_1.db,
    tableName: "Recipe",
    modelName: "Recipe",
});
exports.default = Recipe;
