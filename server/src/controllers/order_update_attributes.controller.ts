import { Request, Response } from "express";
import axios from "axios";
import { GraphQLClient } from "graphql-request";
import dotenv from "dotenv";
import { promisify } from "util";
import {
  orderQuery,
  ordersQuery,
  orderUpdateMutation,
} from "../queries/orders";
const sleep = promisify(setTimeout);
dotenv.config();

const { ACCESS_TOKEN, STORE, API_VERSION } = process.env;

export const order_update_attributes = async (req: Request, res: Response) => {
  try {
    let orderId = req.query.order_id as string;
    // orderId = "gid://shopify/Order/6317321584987";
    const client = new GraphQLClient(
      `https://${STORE}/admin/api/${API_VERSION}/graphql.json`,
      {
        // @ts-ignore
        headers: {
          "X-Shopify-Access-Token": ACCESS_TOKEN,
        },
      }
    );

    let orders = await client.request(ordersQuery, {
      query: `id:${orderId.replace("gid://shopify/Order/", "")}`,
    });
    let order = orders.orders.edges[0]?.node;
    let programsItems = order.lineItems.edges.filter((line: any) => {
      return line.node.variant.product.tags.includes("Programy");
    });
    if (programsItems?.length <= 0)
      return res.status(200).json("Order has no programs");
    let hasEndDateAttributes = order.customAttributes.filter((attr: any) => {
      return attr.key.startsWith("Konec_");
    });
    if (hasEndDateAttributes?.length > 0)
      return res
        .status(200)
        .json("Order has end date attributes, no action needed");
    if (hasEndDateAttributes?.length <= 0) {
      let orderAttributes = order.customAttributes;
      let newAttributes = [];

      for (let program of programsItems) {
        let startDate = order.customAttributes.find((attr: any) => {
          return attr.key === `Datum začátku Yes Krabiček`;
        });
        let startDateValue = startDate?.value;
        let programLength =
          parseInt(program.node.variant.title.split("(")[1].split(" dní)")[0]) -
          1;
        let endDate = calculateNewDate(startDateValue, programLength);
        let endDateAttribute = {
          key: `Konec_${program.node.variant.id.replace(
            "gid://shopify/ProductVariant/",
            ""
          )}`,
          value: endDate,
        };
        orderAttributes.push(endDateAttribute);
      }

      let updateOrder = await client.request(orderUpdateMutation, {
        input: {
          id: orderId,
          customAttributes: orderAttributes,
        },
      });
      console.log(updateOrder);
    }

    return res.status(200).json(`Order ${orderId} updated`);
  } catch {}
};

function calculateNewDate(startDateStr: string, daysToAdd: number): string {
  const [day, month, year] = startDateStr.split("-").map(Number);
  const startDate = new Date(year, month - 1, day);
  startDate.setDate(startDate.getDate() + daysToAdd);
  const newDay = String(startDate.getDate()).padStart(2, "0");
  const newMonth = String(startDate.getMonth() + 1).padStart(2, "0");
  const newYear = startDate.getFullYear();

  return `${newDay}-${newMonth}-${newYear}`;
}
