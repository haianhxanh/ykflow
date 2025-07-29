import { Request, Response } from "express";
import dotenv from "dotenv";
import { GraphQLClient } from "graphql-request";
import ExcelJS from "exceljs";
import { allProductsQuery } from "../queries/products";
import { addTagsMutation } from "../queries/commonObjects";
import { inventoryBulkToggleActivation, inventorySetQuantities } from "../queries/inventory";
import { locationsQuery } from "../queries/locations";
dotenv.config();
const { ACCESS_TOKEN, STORE, API_VERSION } = process.env;

/*-------------------------------------MAIN FUNCTION------------------------------------------------*/

export const bulk_activate_inventory_at_locations = async (req: Request, res: Response) => {
  try {
    const client = new GraphQLClient(`https://${STORE}/admin/api/${API_VERSION}/graphql.json`, {
      // @ts-ignore
      headers: {
        "X-Shopify-Access-Token": ACCESS_TOKEN,
      },
    });

    const locations = await client.request(locationsQuery);
    const locationIds = locations.locations.edges.map((location: any) => location.node.id);

    const programsQuery = "tag:Programy OR tag:Monoporce";
    const programs = await allProductsQuery(programsQuery);

    const nonProgramProductsQuery = "tag_not:Programy AND tag_not:Monoporce";
    const nonProgramProducts = await allProductsQuery(nonProgramProductsQuery);

    for (const locationId of locationIds) {
      console.log(`Activating inventory at location ${locationId} ===============================`);
      for (const program of programs) {
        for (const variant of program.node.variants.edges) {
          const locationActivate = await client.request(inventoryBulkToggleActivation, {
            inventoryItemId: variant.node.inventoryItem.id,
            inventoryItemUpdates: [
              {
                locationId: locationId,
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

      console.log(`Activating inventory at location ${locationId} ===============================`);
      for (const product of nonProgramProducts) {
        for (const variant of product.node.variants.edges) {
          const locationActivate = await client.request(inventoryBulkToggleActivation, {
            inventoryItemId: variant.node.inventoryItem.id,
            inventoryItemUpdates: [
              {
                locationId: locationId,
                activate: true,
              },
            ],
          });
          await new Promise((resolve) => setTimeout(resolve, 200));
          if (locationActivate.inventoryBulkToggleActivation.userErrors.length > 0) {
            console.log(variant.node.inventoryItem.id, locationActivate.inventoryBulkToggleActivation.userErrors);
          }
          console.log(`Activated inventory at location ${locationId} for variant ${variant.node.sku}`);

          if (!variant.node.inventoryItem.tracked) continue;
          if (variant.node.inventoryItem.inventoryLevels.edges[0].node.quantities.quantity == 9999) {
            continue;
          }
          const inventoryQuantities = await client.request(inventorySetQuantities, {
            input: {
              ignoreCompareQuantity: true,
              name: "available",
              quantities: [
                {
                  inventoryItemId: variant.node.inventoryItem.id,
                  locationId: locationId,
                  quantity: 9999,
                },
              ],
              reason: "other",
            },
          });
          await new Promise((resolve) => setTimeout(resolve, 200));
          if (inventoryQuantities.inventorySetQuantities.userErrors.length > 0) {
            console.log(variant.node.inventoryItem.id, inventoryQuantities.inventorySetQuantities.userErrors);
          }
          console.log(`Set inventory at location ${locationId} for variant ${variant.node.sku}`);
          // return res.status(200).json(inventoryQuantities);
        }
      }
    }

    return res.status(200).json({ message: "Inventory activated at all locations" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
