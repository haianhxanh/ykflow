import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from "sequelize";
import { db } from "../database_connection/db_connect";

class Rating extends Model<InferAttributes<Rating>, InferCreationAttributes<Rating>> {
  declare id: CreationOptional<number>;
  declare rating: number; // 1 - 5 stars
  declare recipe_id: number;
  declare recipe_name: string;
  declare recipe_type: string;
  declare shopify_user_id: number;
  declare comment: string;
  declare meal_date: Date;
  declare keep_menu: boolean | null;
  declare keep_menu_note: string | null;
}

Rating.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    rating: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    recipe_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    recipe_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    recipe_type: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    shopify_user_id: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    comment: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    meal_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    keep_menu: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      defaultValue: null,
    },
    keep_menu_note: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    sequelize: db,
    tableName: "Rating",
    modelName: "Rating",
  },
);

export default Rating;
