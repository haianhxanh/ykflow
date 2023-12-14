import { STATUS, STATUS_STRINGS } from "./../utils/constants";
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

export const update_inquiry = async (req: Request, res: Response) => {
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

    // update Shopify

    const inquiry: any = await Inquiry.findOne({
      where: {
        id: req.body.id,
      },
    });

    const order_metafields_data = await axios.get(
      `https://${STORE}/admin/api/${API_VERSION}/orders/${inquiry.order_id}/metafields.json`,
      {
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": ACCESS_TOKEN!,
        },
      }
    );

    let metafields = order_metafields_data.data.metafields;
    let inquiries = JSON.parse(metafields[0].value);
    let inquiryItem = inquiries.find(
      (item: any) => parseInt(item.item.id) == parseInt(inquiry.item_id)
    );

    let inquiryIndex = inquiries.findIndex(
      (item: any) => parseInt(item.details.inquiry_id) == parseInt(inquiry.id)
    );

    inquiries[inquiryIndex].details.status =
      req.body.status == STATUS.APPROVED
        ? STATUS_STRINGS.APPROVED
        : STATUS_STRINGS.DECLINED;

    let array = [];
    let order_metafield_value = {
      item: {
        id: inquiry.item_id,
        title: inquiry.item_title,
      },
      details: {
        inquiry_id: inquiry.id,
        pause_start_date: inquiry.pause_start_date,
        pause_end_date: inquiry.pause_end_date,
        requested: true,
        status: STATUS.APPROVED
          ? STATUS_STRINGS.APPROVED
          : STATUS_STRINGS.DECLINED,
      },
    };
    array.push(order_metafield_value);

    let body = JSON.stringify({
      metafield: {
        namespace: "flow",
        key: "inquiries",
        type: "json",
        value: JSON.stringify(array),
      },
    });

    const order_metafield_update: any = await axios.post(
      `https://${STORE}/admin/api/${API_VERSION}/orders/${inquiry.order_id}/metafields.json`,
      body,
      {
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": ACCESS_TOKEN!,
        },
      }
    );

    // inquiries[inquiryIndexIndex].value = "Laila";

    // const obj: {
    //   namespace: string;
    //   key: string;
    //   value: string;
    //   type: string;
    // } = {
    //   namespace: metafields[0].namespace,
    //   key: metafields[0].key,
    //   // value: .value,
    //   type: metafields[0].type,
    // };

    // let metafields_inquiries_array: InquiryMetafield[] = [];

    // metafields.forEach((metafield: any) => {
    //   const obj: {
    //     namespace: string;
    //     key: string;
    //     value: string;
    //     type: string;
    //   } = {
    //     namespace: metafield.namespace,
    //     key: metafield.key,
    //     value: metafield.value,
    //     type: metafield.type,
    //   };

    //   metafields_inquiries_array.push(obj);
    // });

    // let metafields_inquiry = metafields_inquiries_array.find(
    //   (metafield: InquiryMetafield) => metafield.key == "inquiries"
    // );

    // let metafields_array = JSON.parse(metafields);
    // console.log(metafields_inquiry);

    // let inquiryItem = metafields_array.find(
    //   (item: any) => parseInt(item.id) == parseInt(inquiry.item_id)
    // );
    // console.log(inquiryItem);

    return res.status(200).json({
      message: `Status of the inquiry has been updated`,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
