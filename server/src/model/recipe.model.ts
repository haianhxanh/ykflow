import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
} from "sequelize";
import { db } from "../database_connection/db_connect";

class Recipe extends Model<
  InferAttributes<Recipe>,
  InferCreationAttributes<Recipe>
> {
  declare id: CreationOptional<number>;
  declare name: string;
  declare type: string; // breakfast, snack_1, lunch, snack_2, dinner
}

Recipe.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    type: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  },
  {
    sequelize: db,
    tableName: "Recipe",
    modelName: "Recipe",
  }
);

export default Recipe;
