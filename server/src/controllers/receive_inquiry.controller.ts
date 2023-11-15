import { API_RESPONSES, STATUS } from "./../utils/constants";
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

export const receive_inquiries = async (req: Request, res: Response) => {
  try {
    // catch missing content
    if (
      !req.body.pause_start_date ||
      !req.body.pause_end_date ||
      !req.body.item_title ||
      !req.body.order_id ||
      !req.body.order_contact ||
      !req.body.order_name
    ) {
      if (!req.body.pause_start_date || !req.body.pause_end_date)
        return res.status(422).json({
          message: API_RESPONSES.MISSING_DATE,
        });

      if (!req.body.item_title)
        return res.status(422).json({
          message: API_RESPONSES.MISSING_ORDER_ITEM,
        });

      if (!req.body.order_contact)
        return res.status(422).json({
          message: API_RESPONSES.MISSING_ORDER_ITEM,
        });

      if (!req.body.order_name)
        return res.status(422).json({
          message: API_RESPONSES.MISSING_ORDER_NAME,
        });

      if (!req.body.order_id)
        return res.status(422).json({
          message: API_RESPONSES.MISSING_ORDER_ID,
        });
    }
    const order_data = await axios.get(
      `https://${STORE}/admin/api/${API_VERSION}/orders/${req.body.order_id}.json`,
      {
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": ACCESS_TOKEN!,
        },
      }
    );

    let start_date = order_data.data.order.note_attributes.find(
      (attr: any) => attr.name == STRINGS.ORDER_ATTR_START_DATE
    ).value;

    let pause_start_date = req.body.pause_start_date;
    let pause_end_date = req.body.pause_end_date;

    // calc total package days length
    let package_days_length = parseInt(
      req.body.item_title.split("(")[1].split(")")[0].split(" dní")
    );

    // calc days used (excl. weekends)
    let package_days_used = getBusinessDatesCount(
      // parse start_date from Shopify admin
      convertDateToISOString(start_date),
      req.body.pause_start_date
    );

    let package_days_left = package_days_length - package_days_used;

    let package_new_end_date = getFutureBusinessDate(
      pause_end_date,
      package_days_left
    );

    let date = new Date();
    let today_date = date.toISOString().split("T")[0];

    const new_inquiry = await Inquiry.create({
      id: v4(),
      order_name: req.body.order_name,
      order_id: req.body.order_id,
      order_contact: req.body.order_contact,
      pause_start_date: req.body.pause_start_date,
      pause_end_date: req.body.pause_end_date,
      item_title: req.body.item_title,
      new_end_date: package_new_end_date,
      status: STATUS.NEW,
      request_date: today_date,
    });

    /*-------------------------------------NOTIFY CUSTOMER-----------------------------------------*/

    /*-------------------------------------NOTIFY MERCHANT-----------------------------------------*/

    return res.status(200).json({
      request_id: `ID požadavku: ${new_inquiry.request_id}`,
      message: `Váš požadavek byl zapsán do našeho systému. Požádala jste o pozastavení krabičky od ${pause_start_date} do ${pause_end_date} včetně. V nejbližší době se Vám ozveme o potvrzení požadavku`,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
