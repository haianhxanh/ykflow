import { STATUS, STATUS_STRINGS } from "../utils/constants";
import express, { Request, Response } from "express";
import axios from "axios";
import dotenv from "dotenv";
import Inquiry from "../model/inquiry.model";
import { STRINGS } from "../utils/constants";
import {
  convertDateToISOString,
  convertDateToLocalString,
  getBusinessDatesCount,
  getFutureBusinessDate,
} from "../utils/helpers";
import { v4 } from "uuid";
import { array } from "joi";

dotenv.config();
const { ACCESS_TOKEN, STORE, API_VERSION } = process.env;

interface InquiryMetafield {
  namespace: string;
  key: string;
  value: string;
  type: string;
}

/*-------------------------------------RECEIVE INQUIRY-----------------------------------------*/

export const delete_inquiry = async (req: Request, res: Response) => {
  try {
    if (!req.body.id) {
      return res.status(422).json({
        message: "Missing inquiry ID",
      });
    }

    /*---------------------------------UPDATE DATABASE-------------------------------------*/

    const update_status = await Inquiry.destroy({
      where: {
        id: req.body.id,
      },
    });

    /*---------------------------------UPDATE SHOPIFY-------------------------------------*/

    // const inquiry: any = await Inquiry.findOne({
    //   where: {
    //     id: req.body.id,
    //   },
    // });

    // const order_metafields_data = await axios.get(
    //   `https://${STORE}/admin/api/${API_VERSION}/orders/${inquiry.order_id}/metafields.json`,
    //   {
    //     headers: {
    //       "Content-Type": "application/json",
    //       "X-Shopify-Access-Token": ACCESS_TOKEN!,
    //     },
    //   }
    // );

    // let metafields = order_metafields_data.data.metafields;
    // const metafield_inquiry = order_metafields_data.data.metafields.find(
    //   (metafield: any) => {
    //     return metafield.namespace === "flow" && metafield.key === "inquiries";
    //   }
    // );
    // let metafield_inquiry_value_array = JSON.parse(metafield_inquiry.value);

    // let inquiryIndex = metafield_inquiry_value_array.findIndex(
    //   (item: any) => parseInt(item.id) == parseInt(inquiry.id)
    // );

    // metafield_inquiry_value_array[inquiryIndex].status =
    //   req.body.status == STATUS.APPROVED ? STATUS.APPROVED : STATUS.DECLINED;

    // let body = JSON.stringify({
    //   metafield: {
    //     namespace: "flow",
    //     key: "inquiries",
    //     type: "json",
    //     value: JSON.stringify(metafield_inquiry_value_array),
    //   },
    // });

    // const order_metafield_update: any = await axios.post(
    //   `https://${STORE}/admin/api/${API_VERSION}/orders/${inquiry.order_id}/metafields.json`,
    //   body,
    //   {
    //     headers: {
    //       "Content-Type": "application/json",
    //       "X-Shopify-Access-Token": ACCESS_TOKEN!,
    //     },
    //   }
    // );

    return res.status(200).json({
      message: `Status of the inquiry has been updated`,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
