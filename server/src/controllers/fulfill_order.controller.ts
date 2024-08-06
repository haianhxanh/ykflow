import { Request, Response } from "express";
import axios from "axios";
import dotenv from "dotenv";
import { promisify } from "util";
const sleep = promisify(setTimeout);
dotenv.config();

const { ACCESS_TOKEN, STORE, API_VERSION } = process.env;

export const fulfill = async (req: Request, res: Response) => {
  try {
    let order_id = req.query.order_id as string;
    if (!order_id) {
      return res.status(400).send("Order ID is required");
    }
    order_id = order_id.replace("gid://shopify/Order/", "");
    let fulfilled_order = await fulfill_order(order_id);
    res.status(200).send(`Order ${req.query.order_id} has been fulfilled`);
  } catch {
    res.status(400).send(`Order ${req.query.order_id} could not be fulfilled`);
  }
};

const fulfill_order = async (order_id: string) => {
  const { data } = await axios.get(
    `https://${STORE}/admin/api/${API_VERSION}/orders/${order_id}/fulfillment_orders.json`,
    {
      headers: {
        "X-Shopify-Access-Token": ACCESS_TOKEN!,
      },
    }
  );

  const create_fulfillment = {
    fulfillment: {
      line_items_by_fulfillment_order: [
        {
          fulfillment_order_id: data.fulfillment_orders[0]?.id,
        },
      ],
      notify_customer: false,
    },
  };

  const create_fulfillment_res: any = await axios.post(
    `https://${STORE}/admin/api/${API_VERSION}/fulfillments.json`,
    create_fulfillment,
    {
      headers: {
        "X-Shopify-Access-Token": ACCESS_TOKEN!,
        "Content-Type": "application/json",
      },
    }
  );

  return create_fulfillment_res;
};
