import { STRINGS } from "../utils/constants";
import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model, UUID } from "sequelize";
import { db } from "../database_connection/db_connect";

class EasterDiscount extends Model<InferAttributes<EasterDiscount>, InferCreationAttributes<EasterDiscount>> {
  declare id: CreationOptional<number>;
  declare discount_type: string;
  declare discount_percentage: number;
  declare email: string;
  declare discount_code: string;
}

EasterDiscount.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    discount_type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    discount_percentage: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    discount_code: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  },
  {
    sequelize: db,
    tableName: "easter_discount",
    modelName: "easter_discount",
  }
);

export default EasterDiscount;
