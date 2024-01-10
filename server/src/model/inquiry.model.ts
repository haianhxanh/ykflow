import { STRINGS } from "./../utils/constants";
import {
  CreationOptional,
  DataTypes,
  InferAttributes,
  InferCreationAttributes,
  Model,
  UUID,
} from "sequelize";
import { db } from "../database_connection/db_connect";

class Inquiry extends Model<
  InferAttributes<Inquiry>,
  InferCreationAttributes<Inquiry>
> {
  declare id: CreationOptional<number>;
  declare order_name: string;
  declare order_id: number;
  declare order_contact: string;
  declare pause_start_date: string;
  declare pause_end_date: string;
  declare item_title: string;
  declare item_id: number;
  declare new_start_date: string;
  declare new_end_date: string;
  declare status: string;
  declare request_date: string;
  declare note: string;
}

Inquiry.init(
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    order_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    order_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    order_contact: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    pause_start_date: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    pause_end_date: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    item_title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    item_id: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    note: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    new_start_date: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    new_end_date: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    request_date: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    sequelize: db,
    tableName: "Request",
    modelName: "Request",
  }
);

export default Inquiry;
