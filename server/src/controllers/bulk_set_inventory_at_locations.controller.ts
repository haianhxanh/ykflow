import { Request, Response } from "express";
import dotenv from "dotenv";
import { GraphQLClient } from "graphql-request";
import { allProductsQuery } from "../queries/products";
import { inventoryBulkToggleActivation, inventoryItemUpdate, inventorySetQuantities } from "../queries/inventory";
import { locationsQuery } from "../queries/locations";
import { productVariantsBulkUpdate } from "../queries/variants";
dotenv.config();
const { ACCESS_TOKEN, STORE, API_VERSION } = process.env;

/*-------------------------------------MAIN FUNCTION------------------------------------------------*/

export const bulk_set_inventory_at_locations = async (req: Request, res: Response) => {
  try {
    const client = new GraphQLClient(`https://${STORE}/admin/api/${API_VERSION}/graphql.json`, {
      // @ts-ignore
      headers: {
        "X-Shopify-Access-Token": ACCESS_TOKEN,
      },
    });

    const locations = await client.request(locationsQuery);
    const locationIds = locations.locations.edges.map((location: any) => location.node.id);

    const allProducts = await allProductsQuery("vendor:BrainMarket");

    // return res.status(200).json(allProducts);

    for (const [locationIndex, locationId] of locationIds.entries()) {
      console.log(`Activating inventory at location ${locationId} ===============================`);
      if (locationIndex <= 8) {
        continue;
      }
      for (const [productIndex, product] of allProducts.entries()) {
        console.log(`Processing product ${productIndex + 1}/${allProducts.length} at location ${locationIndex + 1}/${locationIds.length}`);
        for (const variant of product.node.variants.edges) {
          // 1. Activate inventory at location
          const locationActivate = await client.request(inventoryBulkToggleActivation, {
            inventoryItemId: variant.node.inventoryItem.id,
            inventoryItemUpdates: [
              {
                locationId: locationId,
                activate: true,
              },
            ],
          });
          console.log("Variant SKU: ", variant.node.sku);
          if (locationActivate.inventoryBulkToggleActivation.userErrors.length > 0) {
            console.log(
              `Error Activating inventory at location ${locationId} for variant ${variant.node.inventoryItem.id}`,
              locationActivate.inventoryBulkToggleActivation.userErrors
            );
          }
          await new Promise((resolve) => setTimeout(resolve, 100));

          // 2. Enable Track quantity
          const trackQuantity = await client.request(inventoryItemUpdate, {
            id: variant.node.inventoryItem.id,
            input: {
              tracked: true,
            },
          });

          if (trackQuantity.inventoryItemUpdate.userErrors.length > 0) {
            console.log(`Error enabling Track quantity for variant ${variant.node.inventoryItem.id}`, trackQuantity.inventoryItemUpdate.userErrors);
          }
          await new Promise((resolve) => setTimeout(resolve, 100));

          // 3. Enable Continue selling
          const continueSelling = await client.request(productVariantsBulkUpdate, {
            productId: product.node.id,
            variants: [
              {
                id: variant.node.id,
                inventoryPolicy: "CONTINUE",
              },
            ],
          });

          if (continueSelling.productVariantsBulkUpdate.userErrors.length > 0) {
            console.log(`Error enabling Continue selling for variant ${variant.node.id}`, continueSelling.productVariantsBulkUpdate.userErrors);
          }
          await new Promise((resolve) => setTimeout(resolve, 100));

          // 4. Set Inventory quantity to 0
          const inventoryQuantities = await client.request(inventorySetQuantities, {
            input: {
              ignoreCompareQuantity: true,
              name: "available",
              quantities: [
                {
                  inventoryItemId: variant.node.inventoryItem.id,
                  locationId: locationId,
                  quantity: 0,
                },
              ],
              reason: "other",
            },
          });

          if (inventoryQuantities.inventorySetQuantities.userErrors.length > 0) {
            console.log(`Error setting Inventory quantity to 0 for variant ${variant.node.id}`, inventoryQuantities.inventorySetQuantities.userErrors);
          }
          await new Promise((resolve) => setTimeout(resolve, 100));

          console.log(`Inventory updated for variant ${variant.node.id} at location ${locationId}`);
        }
      }
    }

    return res.status(200).json({ message: "Inventory activated at all locations" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
