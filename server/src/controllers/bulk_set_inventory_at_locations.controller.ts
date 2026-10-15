import { Request, Response } from "express";
import dotenv from "dotenv";
import { GraphQLClient } from "graphql-request";
import { allProductsQuery } from "../queries/products";
import { inventoryBulkToggleActivation, inventoryItemUpdate, inventorySetQuantities } from "../queries/inventory";
import { locationsQuery } from "../queries/locations";
import { productVariantsBulkUpdate } from "../queries/variants";
dotenv.config();
const { ACCESS_TOKEN, STORE, API_VERSION } = process.env;

// Max (inventory item, location) pairs sent in one inventorySetQuantities call
const QUANTITIES_BATCH_SIZE = 250;

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
    const locationIds: string[] = locations.locations.edges.map((location: any) => location.node.id);
    const inventoryItemUpdates = locationIds.map((locationId) => ({ locationId, activate: true }));

    const allProducts = await allProductsQuery("tag:Programy");

    // Quantities are collected across variants and locations and sent in batches
    let pendingQuantities: { inventoryItemId: string; locationId: string; quantity: number }[] = [];
    const flushQuantities = async () => {
      if (pendingQuantities.length === 0) return;
      const batch = pendingQuantities;
      pendingQuantities = [];
      const inventoryQuantities = await client.request(inventorySetQuantities, {
        input: {
          ignoreCompareQuantity: true,
          name: "available",
          quantities: batch,
          reason: "other",
        },
      });
      if (inventoryQuantities.inventorySetQuantities.userErrors.length > 0) {
        console.log("Error setting Inventory quantity to 0", inventoryQuantities.inventorySetQuantities.userErrors);
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
      console.log(`Inventory quantity set to 0 for ${batch.length} variant/location pairs`);
    };

    console.log(`Setting inventory at ${locationIds.length} locations ===============================`);
    for (const [productIndex, product] of allProducts.entries()) {
      console.log(`Processing product ${productIndex + 1}/${allProducts.length}`);
      for (const variant of product.node.variants.edges) {
        // 1. Activate inventory at all locations
        const locationActivate = await client.request(inventoryBulkToggleActivation, {
          inventoryItemId: variant.node.inventoryItem.id,
          inventoryItemUpdates,
        });
        console.log("Variant SKU: ", variant.node.sku);
        if (locationActivate.inventoryBulkToggleActivation.userErrors.length > 0) {
          console.log(
            `Error Activating inventory at locations for variant ${variant.node.inventoryItem.id}`,
            locationActivate.inventoryBulkToggleActivation.userErrors
          );
        }
        await new Promise((resolve) => setTimeout(resolve, 100));

        // 2. Enable Track quantity (per inventory item, not per location)
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
      }

      // 3. Enable Continue selling for all variants of the product at once
      const continueSelling = await client.request(productVariantsBulkUpdate, {
        productId: product.node.id,
        variants: product.node.variants.edges.map((variant: any) => ({
          id: variant.node.id,
          inventoryPolicy: "CONTINUE",
        })),
      });

      if (continueSelling.productVariantsBulkUpdate.userErrors.length > 0) {
        console.log(`Error enabling Continue selling for product ${product.node.id}`, continueSelling.productVariantsBulkUpdate.userErrors);
      }
      await new Promise((resolve) => setTimeout(resolve, 100));

      // 4. Queue Inventory quantity 0 at all locations (sent in batches)
      for (const variant of product.node.variants.edges) {
        for (const locationId of locationIds) {
          pendingQuantities.push({ inventoryItemId: variant.node.inventoryItem.id, locationId, quantity: 0 });
          if (pendingQuantities.length >= QUANTITIES_BATCH_SIZE) await flushQuantities();
        }
      }

      console.log(`Inventory updated for product ${product.node.id} at ${locationIds.length} locations`);
    }
    await flushQuantities();

    return res.status(200).json({ message: "Inventory activated at all locations" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
