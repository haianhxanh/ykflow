import { STATUS, STATUS_STRINGS } from "./../utils/constants";
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
import { sendNotification } from "../utils/notification";

dotenv.config();
const { ACCESS_TOKEN, STORE, API_VERSION, MANDRILL_MESSAGE_FROM_EMAIL } =
  process.env;

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

    /*---------------------------------UPDATE DATABASE-------------------------------------*/

    const update_status = await Inquiry.update(
      { status: req.body.status },
      {
        where: {
          id: req.body.id,
        },
      }
    );

    /*---------------------------------UPDATE SHOPIFY-------------------------------------*/

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
    const metafield_inquiry = order_metafields_data.data.metafields.find(
      (metafield: any) => {
        return metafield.namespace === "flow" && metafield.key === "inquiries";
      }
    );
    let metafield_inquiry_value_array = JSON.parse(metafield_inquiry.value);

    let inquiryIndex = metafield_inquiry_value_array.findIndex(
      (item: any) => parseInt(item.id) == parseInt(inquiry.id)
    );

    metafield_inquiry_value_array[inquiryIndex].status =
      req.body.status == STATUS.APPROVED ? STATUS.APPROVED : STATUS.DECLINED;

    let body = JSON.stringify({
      metafield: {
        namespace: "flow",
        key: "inquiries",
        type: "json",
        value: JSON.stringify(metafield_inquiry_value_array),
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

    let pauseStartDate = convertDateToISOString(inquiry.pause_start_date);
    let pauseEndDate = convertDateToISOString(inquiry.pause_end_date);
    let newStartDate = convertDateToISOString(inquiry.new_start_date);
    let newEndDate = convertDateToISOString(inquiry.new_end_date);

    const shopify_order = await axios.get(
      `https://${STORE}/admin/api/${API_VERSION}/orders/${inquiry.order_id}.json`,
      {
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": ACCESS_TOKEN!,
        },
      }
    );

    let order_attributes = shopify_order.data.order.note_attributes;
    order_attributes.push({
      name: "NOVÉ Datum začátku",
      value: newStartDate,
    });
    order_attributes.push({
      name: "NOVÉ Datum ukončení",
      value: newEndDate,
    });

    const order_attributes_update = await axios.put(
      `https://${STORE}/admin/api/${API_VERSION}/orders/${inquiry.order_id}.json`,
      {
        order: {
          id: inquiry.order_id,
          note_attributes: order_attributes,
        },
      },
      {
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": ACCESS_TOKEN!,
        },
      }
    );

    if (req.body.status == STATUS.APPROVED && inquiry) {
      let message = `Váš požadavek o pozastavení krabičky ${inquiry.item_title} (obj. č. ${inquiry.order_name}) od ${pauseStartDate} do ${pauseEndDate} (včetně) byl schválen. Krabičky budeme nově rozvážet od  ${newStartDate} do ${newEndDate} (včetně).`;

      let notificationSubject = `Vaše žádost o pozastavení Yes Krabičky (obj. ${inquiry.order_name}) byla schválena`;
      const sendNotificationToMerchant = await sendNotification(
        notificationSubject,
        inquiry.order_contact,
        message,
        MANDRILL_MESSAGE_FROM_EMAIL as string,
        undefined
      );
    }

    return res.status(200).json({
      message: `Status of the inquiry has been updated`,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
