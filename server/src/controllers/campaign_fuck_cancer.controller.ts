import { Request, Response } from "express";
import { GraphQLClient } from "graphql-request";
import dotenv from "dotenv";
import {
  metafieldsSetMutation,
  shopMetafieldQuery,
} from "../queries/metafields";
dotenv.config();
const { ACCESS_TOKEN, STORE, API_VERSION } = process.env;
export const campaign_fuck_cancer = async (req: Request, res: Response) => {
  try {
    const client = new GraphQLClient(
      `https://${STORE}/admin/api/${API_VERSION}/graphql.json`,
      {
        // @ts-ignore
        headers: {
          "X-Shopify-Access-Token": ACCESS_TOKEN,
        },
      }
    );

    const createdDate = req?.body?.created_at?.split("T")[0];

    const createdDateIsInRange = isDateInDateRange(
      createdDate,
      "2025-02-03",
      "2025-02-09"
    );

    if (!createdDateIsInRange) {
      console.log(
        `${req.body.admin_graphql_api_id} with created_at ${createdDate} date out of range`
      );
      return res.status(200).json("Date not in range");
    }

    const totalPrice = req?.body?.total_price;
    const donation = totalPrice * 0.1;
    const metafield = await client.request(shopMetafieldQuery, {
      namespace: "campaign",
      key: "fuck_cancer",
    });
    const shopId = metafield?.shop?.id;
    const value = metafield?.shop?.metafield?.value
      ? parseFloat(metafield?.shop?.metafield?.value)
      : 0;

    const newValue = (donation + value).toFixed(2);
    console.log("newValue", newValue);
    const metafieldsUpdate = await client.request(metafieldsSetMutation, {
      metafields: [
        {
          key: "fuck_cancer",
          namespace: "campaign",
          ownerId: shopId,
          type: "number_decimal",
          value: newValue.toString(),
        },
      ],
    });
    return res.status(200).json("ok");
  } catch (error) {
    console.error(error);
    return res.status(200).json({ message: "Internal Server Error" });
  }
};

// check if date is between two dates
function isDateInDateRange(
  date: string,
  startDate: string,
  endDate: string
): boolean {
  const inputDate = new Date(date);
  const start = new Date(startDate);
  const end = new Date(endDate);
  return inputDate >= start && inputDate <= end;
}
