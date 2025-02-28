import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from "sequelize";
import { db } from "../database_connection/db_connect";

class Rating extends Model<
  InferAttributes<Rating>,
  InferCreationAttributes<Rating>
> {
  declare id: CreationOptional<number>;
  declare rating: number; // 1 - 5 stars
  declare recipe_id: number;
  declare recipe_name: string;
  declare recipe_type: string;
  declare shopify_user_id: number;
  declare comment: string;
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
  },
  {
    sequelize: db,
    tableName: "Rating",
    modelName: "Rating",
  }
);

export default Rating;
