import { Request, Response } from "express";
import dotenv from "dotenv";
import { GraphQLClient } from "graphql-request";
import { allProductsQuery } from "../queries/products";
import { inventoryBulkToggleActivation, inventorySetQuantities } from "../queries/inventory";
import { locationsQuery } from "../queries/locations";
dotenv.config();
const { ACCESS_TOKEN, STORE, API_VERSION } = process.env;

// Max (inventory item, location) pairs sent in one inventorySetQuantities call
const QUANTITIES_BATCH_SIZE = 250;

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
    const locationIds: string[] = locations.locations.edges.map((location: any) => location.node.id);
    // Each variant is activated at all locations in a single request
    const inventoryItemUpdates = locationIds.map((locationId) => ({ locationId, activate: true }));

    const programsQuery = "tag:Programy OR tag:Monoporce";
    const programs = await allProductsQuery(programsQuery);

    const nonProgramProductsQuery = "tag_not:Programy AND tag_not:Monoporce";
    const nonProgramProducts = await allProductsQuery(nonProgramProductsQuery);

    const activateAtAllLocations = async (variant: any) => {
      const locationActivate = await client.request(inventoryBulkToggleActivation, {
        inventoryItemId: variant.node.inventoryItem.id,
        inventoryItemUpdates,
      });
      await new Promise((resolve) => setTimeout(resolve, 200));
      if (locationActivate.inventoryBulkToggleActivation.userErrors.length > 0) {
        console.log(variant.node.inventoryItem.id, locationActivate.inventoryBulkToggleActivation.userErrors);
      }
      console.log(`Activated inventory at ${locationIds.length} locations for variant ${variant.node.sku}`);
    };

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
      await new Promise((resolve) => setTimeout(resolve, 200));
      if (inventoryQuantities.inventorySetQuantities.userErrors.length > 0) {
        console.log("Error setting inventory quantities", inventoryQuantities.inventorySetQuantities.userErrors);
      }
      console.log(`Set inventory for ${batch.length} variant/location pairs`);
    };

    console.log(`Activating programs at ${locationIds.length} locations ===============================`);
    for (const program of programs) {
      for (const variant of program.node.variants.edges) {
        await activateAtAllLocations(variant);
      }
    }

    console.log(`Activating non-program products at ${locationIds.length} locations ===============================`);
    for (const product of nonProgramProducts) {
      for (const variant of product.node.variants.edges) {
        await activateAtAllLocations(variant);

        if (!variant.node.inventoryItem.tracked) continue;
        for (const locationId of locationIds) {
          pendingQuantities.push({ inventoryItemId: variant.node.inventoryItem.id, locationId, quantity: 9999 });
          if (pendingQuantities.length >= QUANTITIES_BATCH_SIZE) await flushQuantities();
        }
      }
    }
    await flushQuantities();

    return res.status(200).json({ message: "Inventory activated at all locations" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
