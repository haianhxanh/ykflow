import { CreationOptional, DataTypes, InferAttributes, InferCreationAttributes, Model } from "sequelize";
import { db } from "../database_connection/db_connect";

class AutomaticDiscounts extends Model<InferAttributes<AutomaticDiscounts>, InferCreationAttributes<AutomaticDiscounts>> {
  declare id: CreationOptional<number>;
  declare gid: string;
}

AutomaticDiscounts.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    gid: {
      type: DataTypes.STRING,
      allowNull: false,
    }
  },
  {
    sequelize: db,
    tableName: "AutomaticDiscounts",
    modelName: "AutomaticDiscounts",
  }
);

export default AutomaticDiscounts;
