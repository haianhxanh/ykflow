"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const sequelize_1 = require("sequelize");
const db_connect_1 = require("../database_connection/db_connect");
class Rating extends sequelize_1.Model {
}
Rating.init({
    id: {
        type: sequelize_1.DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    },
    rating: {
        type: sequelize_1.DataTypes.INTEGER,
        allowNull: false,
    },
    recipe_id: {
        type: sequelize_1.DataTypes.BIGINT,
        allowNull: false,
    },
    recipe_name: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
    },
    recipe_type: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
    },
    shopify_user_id: {
        type: sequelize_1.DataTypes.BIGINT,
        allowNull: true,
    },
    comment: {
        type: sequelize_1.DataTypes.STRING,
        allowNull: true,
    },
    meal_date: {
        type: sequelize_1.DataTypes.DATE,
        allowNull: true,
    },
}, {
    sequelize: db_connect_1.db,
    tableName: "Rating",
    modelName: "Rating",
});
exports.default = Rating;
