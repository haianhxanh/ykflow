import express, { Request, Response } from "express";
import axios from "axios";
import dotenv from "dotenv";
import Inquiry from "../model/inquiry.model";

dotenv.config();

/*-------------------------------------GET INQUIRIES FROM DATABASE------------------------------------------------*/

export const get_order_inquiries = async (req: Request, res: Response) => {
  try {
    if (!req.query.order_id) {
      return res.status(422).json({
        message: "Missing order ID",
      });
    }
    let order_id = parseInt(req.query.order_id.toString());
    const data: any = await Inquiry.findAll({
      where: { order_id: parseInt(req.query.order_id.toString()) },
    });
    const db_data = data.map((db_data: any) => {
      return db_data.dataValues;
    });
    return res.status(200).json(db_data);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
