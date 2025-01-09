import { convertDateToLocalString } from "./../utils/helpers";
import { API_RESPONSES, STATUS, STATUS_STRINGS } from "./../utils/constants";
import express, { Request, Response } from "express";
import axios from "axios";
import dotenv from "dotenv";
import Inquiry from "../model/inquiry.model";
import { STRINGS } from "../utils/constants";
import {
  convertDateToISOString,
  getBusinessDatesCount,
  getFutureBusinessDate,
  isWeekDay,
} from "../utils/helpers";
import { v4 } from "uuid";
import { sendNotification } from "../utils/notification";

dotenv.config();
const { ACCESS_TOKEN, STORE, API_VERSION, MANDRILL_MESSAGE_FROM_EMAIL } =
  process.env;

/*-------------------------------------RECEIVE INQUIRY-----------------------------------------*/

export const receive_inquiry = async (req: Request, res: Response) => {
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
      let errors = [];
      if (!req.body.pause_start_date || !req.body.pause_end_date)
        errors.push(API_RESPONSES.MISSING_DATE);
      if (!req.body.item_title) errors.push(API_RESPONSES.MISSING_ORDER_ITEM);
      if (!req.body.order_contact)
        errors.push(API_RESPONSES.MISSING_ORDER_CONTACT);
      if (!req.body.order_name) errors.push(API_RESPONSES.MISSING_ORDER_NAME);
      if (!req.body.order_id) errors.push(API_RESPONSES.MISSING_ORDER_ID);

      if (
        !req.body.pause_start_date ||
        !req.body.pause_end_date ||
        !req.body.item_title ||
        !req.body.order_contact ||
        !req.body.order_name ||
        !req.body.order_id
      )
        return res.status(422).json({
          errors: errors,
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
    let date = new Date();
    let today_date = date.toISOString().split("T")[0];

    /*---------------------------------INPUT VALIDATION I.-------------------------------------*/
    let errors_validation = [];
    // catch pause start date / pause end date in the past
    if (
      convertDateToISOString(start_date) > pause_start_date ||
      today_date >= pause_start_date ||
      convertDateToISOString(start_date) > pause_end_date
    )
      errors_validation.push(API_RESPONSES.PAST_DATE);

    // catch pause end date before pause start date
    if (pause_start_date > pause_end_date)
      errors_validation.push(API_RESPONSES.INVALID_END_DATE);

    // pause dates must be weekdays
    if (
      isWeekDay(pause_start_date) == false ||
      isWeekDay(pause_end_date) == false
    )
      errors_validation.push(API_RESPONSES.NOT_WORKING_DAY);
    /*---------------------------------DATES CALCULATION-------------------------------------*/

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

    /*---------------------------------INPUT VALIDATION II.-------------------------------------*/

    let package_days_left = package_days_length - package_days_used;
    if (package_days_left <= 0)
      errors_validation.push(API_RESPONSES.OUT_OF_RANGE);

    /*---------------------------------RETURN ALL VALIDATION ERRORS-------------------------------------*/
    if (
      convertDateToISOString(start_date) > pause_start_date ||
      today_date >= pause_start_date ||
      convertDateToISOString(start_date) > pause_end_date ||
      pause_start_date > pause_end_date ||
      isWeekDay(pause_start_date) == false ||
      isWeekDay(pause_end_date) == false ||
      package_days_left <= 0
    ) {
      return res.status(422).json({
        errors: errors_validation,
      });
    }

    /*------------------------------PASSED ALL INPUT VALIDATIONS----------------------------------*/

    let package_new_start_date = getFutureBusinessDate(pause_end_date, 1);
    let package_new_end_date = getFutureBusinessDate(
      pause_end_date,
      package_days_left
    );

    /*---------------------------------NEW RECORD IN DATABASE-------------------------------------*/

    const new_inquiry = await Inquiry.create({
      order_name: req.body.order_name,
      order_id: req.body.order_id,
      order_contact: req.body.order_contact,
      pause_start_date: req.body.pause_start_date,
      pause_end_date: req.body.pause_end_date,
      item_title: req.body.item_title,
      item_id: req.body.item_id,
      new_start_date: package_new_start_date,
      new_end_date: package_new_end_date,
      status: STATUS.NEW,
      request_date: today_date,
      note: req.body.note,
    });

    /*---------------------------------UPDATE ORDER METAFIELDS-------------------------------------*/

    const order_metafields_data = await axios.get(
      `https://${STORE}/admin/api/${API_VERSION}/orders/${req.body.order_id}/metafields.json`,
      {
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": ACCESS_TOKEN!,
        },
      }
    );

    if (res.statusCode == 200) {
      if (
        order_metafields_data.data.metafields.length == 0 ||
        order_metafields_data.data.metafields.find((metafield: any) => {
          return (
            metafield.namespace === "flow" && metafield.key === "inquiries"
          );
        }) == undefined
      ) {
        // create order metafield
        let array = [];
        array.push(new_inquiry.dataValues);
        let body = JSON.stringify({
          metafield: {
            namespace: "flow",
            key: "inquiries",
            type: "json",
            value: JSON.stringify(array),
          },
        });

        setTimeout(async () => {
          const order_metafield_create: any = await axios.post(
            `https://${STORE}/admin/api/${API_VERSION}/orders/${req.body.order_id}/metafields.json`,
            body,
            {
              headers: {
                "Content-Type": "application/json",
                "X-Shopify-Access-Token": ACCESS_TOKEN!,
              },
            }
          );
        }, 1000);
      } else {
        // update order metafield
        const metafield_inquiry = order_metafields_data.data.metafields.find(
          (metafield: any) => {
            return (
              metafield.namespace === "flow" && metafield.key === "inquiries"
            );
          }
        );
        let metafield_inquiry_value_array = JSON.parse(metafield_inquiry.value);
        metafield_inquiry_value_array.push(new_inquiry.dataValues);
        let body = JSON.stringify({
          metafield: {
            namespace: "flow",
            key: "inquiries",
            type: "json",
            value: JSON.stringify(metafield_inquiry_value_array),
          },
        });
        setTimeout(async () => {
          const order_metafield_create: any = await axios.post(
            `https://${STORE}/admin/api/${API_VERSION}/orders/${req.body.order_id}/metafields.json`,
            body,
            {
              headers: {
                "Content-Type": "application/json",
                "X-Shopify-Access-Token": ACCESS_TOKEN!,
              },
            }
          );
        }, 1000);
      }
    }

    /*-------------------------------------SUCCESS RESPONSE-----------------------------------------*/
    /*----------------------------------NOTIFY MERCHANT AND CUSTOMER -------------------------------*/
    let message = `Přijali jsme Váš požadavek o pozastavení krabičky ${
      req.body.item_title
    } od ${convertDateToLocalString(
      pause_start_date
    )} do ${convertDateToLocalString(pause_end_date)} (včetně).`;

    let notificationSubject = `Nová žádost o pozastavení Yes Krabičky (obj. ${req.body.order_name})`;
    const sendNotificationToMerchant = await sendNotification(
      notificationSubject,
      req.body.order_contact,
      message,
      MANDRILL_MESSAGE_FROM_EMAIL as string,
      undefined
    );

    return res.status(200).json({
      request_id: `ID požadavku: ${new_inquiry.id}`,
      message: message,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
