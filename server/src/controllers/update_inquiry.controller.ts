import { STATUS } from "./../utils/constants";
import express, { Request, Response } from "express";
import axios from "axios";
import dotenv from "dotenv";
import Inquiry from "../model/inquiry.model";
import { STRINGS } from "../utils/constants";
import {
  convertDateToISOString,
  getBusinessDatesCount,
  getFutureBusinessDate,
} from "../utils/helpers";
import { v4 } from "uuid";

dotenv.config();
const { ACCESS_TOKEN, STORE, API_VERSION } = process.env;

/*-------------------------------------RECEIVE INQUIRY-----------------------------------------*/

export const update_inquiries = async (req: Request, res: Response) => {
  try {
    if (!req.body.id || !req.body.status) {
      return res.status(422).json({
        message: "Missing inquiry ID or status",
      });
    }

    const update_status = await Inquiry.update(
      { status: req.body.status },
      {
        where: {
          id: req.body.id,
        },
      }
    );

    return res.status(200).json({
      message: `Status of the inquiry has been updated`,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
