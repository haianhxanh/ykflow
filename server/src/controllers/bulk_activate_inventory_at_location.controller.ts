import { Request, Response } from "express";
import dotenv from "dotenv";
import { GraphQLClient } from "graphql-request";
import ExcelJS from "exceljs";
import { allProductsQuery } from "../queries/products";
import { addTagsMutation } from "../queries/commonObjects";
import { inventoryBulkToggleActivation } from "../queries/inventory";
dotenv.config();
const { ACCESS_TOKEN, STORE, API_VERSION } = process.env;

/*----------------------------------- FEATURE DESCRIPTION -------------------------------------------*/
// When adding a new pickup location to the store, the inventory is not activated at the new location.
// This script will bulk activate the inventory at the new location for selected products.
// Specify the following in the script (possibly to move them to query parameters later):
// - location id
// - product query (e.g. tag:Programy)

/*-------------------------------------MAIN FUNCTION------------------------------------------------*/

export const bulk_activate_inventory_at_location = async (req: Request, res: Response) => {
  try {
    const client = new GraphQLClient(`https://${STORE}/admin/api/${API_VERSION}/graphql.json`, {
      // @ts-ignore
      headers: {
        "X-Shopify-Access-Token": ACCESS_TOKEN,
      },
    });

    const locationId = req.query.locationId as string;
    const query = "tag:Programy OR tag:Monoporce";
    const products = await allProductsQuery(query);
    for (const product of products) {
      for (const variant of product.node.variants.edges) {
        const locationActivate = await client.request(inventoryBulkToggleActivation, {
          inventoryItemId: variant.node.inventoryItem.id,
          inventoryItemUpdates: [
            {
              locationId: `gid://shopify/Location/${locationId}`,
              activate: true,
            },
          ],
        });
        console.log(variant.node.sku);
        await new Promise((resolve) => setTimeout(resolve, 250));
        if (locationActivate.inventoryBulkToggleActivation.userErrors.length > 0) {
          console.log(variant.node.inventoryItem.id, locationActivate.inventoryBulkToggleActivation.userErrors);
        }
      }
    }

    return res.status(200).json({ products });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
