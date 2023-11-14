import { STRINGS } from "./../utils/constants";
import { DataTypes, Model, UUID } from "sequelize";
import { db } from "../database_connection/db_connect";

export type INQUIRY = {
  id: string;
  order_name: string;
  order_id: number;
  order_contact: string;
  pause_start_date: string;
  pause_end_date: string;
  item_title: string;
  new_end_date: string;
  status: string;
  request_date: string;
};

class Inquiry extends Model<INQUIRY> {}

Inquiry.init(
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
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
