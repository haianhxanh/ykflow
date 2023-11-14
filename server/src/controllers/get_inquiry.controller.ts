import express, { Request, Response } from "express";
import axios from "axios";
import dotenv from "dotenv";
import Inquiry from "../model/inquiry.model";

dotenv.config();

/*-------------------------------------GET INQUIRIES FROM DATABASE------------------------------------------------*/

export const get_inquiries = async (req: Request, res: Response) => {
  try {
    const data: any = await Inquiry.findAll({ order: [["createdAt", "DESC"]] });
    const db_data = data.map((db_data: any) => {
      return db_data.dataValues;
    });
    return res.status(200).json(db_data);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
