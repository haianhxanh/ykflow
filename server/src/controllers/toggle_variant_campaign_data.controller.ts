import { GraphQLClient } from "graphql-request";
import { programsQueryWithVariants } from "../queries/products";
import { Request, Response } from "express";
import dotenv from "dotenv";
import { metafieldsDeleteMutation, metafieldsSetMutation } from "../queries/metafields";
dotenv.config();

const { STORE, API_VERSION, ACCESS_TOKEN } = process.env;

const ALLOWED_SKU_PREFIXES = ["5D", "10D", "15D", "20D", "40D", "60D"];

const MAX_BATCH_SIZE = 25;

export const toggle_variant_campaign_data = async (req: Request, res: Response) => {
  try {
    const { toggle } = req.query;

    if (!toggle) {
      return res.status(400).json({ message: "toggle parameter with value on/off is required" });
    }

    const client = new GraphQLClient(`https://${STORE}/admin/api/${API_VERSION}/graphql.json`, {
      // @ts-ignore
      headers: {
        "X-Shopify-Access-Token": ACCESS_TOKEN,
      },
    });

    const programs = await client.request(programsQueryWithVariants);
    const variants = programs?.products?.edges?.flatMap((edge: any) =>
      edge?.node?.variants?.edges?.filter((variant: any) => ALLOWED_SKU_PREFIXES.some((prefix: string) => variant?.node?.sku?.startsWith(prefix)))
    );

    try {
      if (toggle === "on") {
        const metafieldsToSet = [];

        for (const variant of variants) {
          metafieldsToSet.push({
            namespace: "campaign",
            key: "data",
            value: JSON.stringify(DUMMY_CAMPAIGN_DATA),
            ownerId: variant.node.id,
          });
        }

        if (metafieldsToSet.length > 0) {
          for (let i = 0; i < metafieldsToSet.length; i += MAX_BATCH_SIZE) {
            const metafieldsSetResponse = await client.request(metafieldsSetMutation, {
              metafields: metafieldsToSet.slice(i, i + MAX_BATCH_SIZE),
            });
            if (metafieldsSetResponse?.metafieldsSet?.userErrors?.length > 0) {
              console.log("Error setting metafields", metafieldsSetResponse?.metafieldsSet?.userErrors);
            } else {
              console.log("Metafields set");
            }
          }
        }
      }

      if (toggle === "off") {
        const metafieldsToDelete = [];
        for (const variant of variants) {
          metafieldsToDelete.push({
            namespace: "campaign",
            key: "data",
            ownerId: variant.node.id,
          });
        }
        if (metafieldsToDelete.length > 0) {
          for (let i = 0; i < metafieldsToDelete.length; i += MAX_BATCH_SIZE) {
            const metafieldsDeleteResponse = await client.request(metafieldsDeleteMutation, {
              metafields: metafieldsToDelete.slice(i, i + MAX_BATCH_SIZE),
            });
            if (metafieldsDeleteResponse?.metafieldsDelete?.userErrors?.length > 0) {
              console.log("Error deleting metafields", metafieldsDeleteResponse?.metafieldsDelete?.userErrors);
            } else {
              console.log("Metafields deleted");
            }
          }
        }
      }
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
  return res.status(200).json({ message: "Campaign data toggled" });
};

const DUMMY_CAMPAIGN_DATA = {
  id: "gid://shopify/DiscountAutomaticNode/1541154570538",
  status: "ACTIVE",
  starts_at: "2025-08-21T21:17:23Z",
  ends_at: null,
  discount_percentage: 0,
  discount_amount: null,
  discount_type: "PERCENTAGE",
};
