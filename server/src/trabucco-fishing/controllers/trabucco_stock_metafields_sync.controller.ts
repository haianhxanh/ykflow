import { Request, Response } from "express";
import dotenv from "dotenv";
import { GraphQLClient, gql } from "graphql-request";
dotenv.config();
const { TRABUCCO_STORE, TRABUCCO_ACCESS_TOKEN, API_VERSION } = process.env;

const PRUMYSLOVA_LOCATION_ID = "gid://shopify/Location/72378614056";

/*-------------------------------------MAIN FUNCTION------------------------------------------------*/
// One-off: for every product variant, read available inventory at the Průmyslová location and set
// stock.internal (number_integer) = that quantity, stock.available_in_cz (boolean) = quantity > 0.
// Mirrors the "Sync variant stock metafields by location" Shopify Flow, but as a one-time full sweep
// instead of a per-event trigger.
// Runs in the background: responds immediately, keeps processing after the response is sent, since a
// full sweep of the catalog exceeds the app's request timeout middleware.
/*-------------------------------------MAIN FUNCTION------------------------------------------------*/

export const trabucco_stock_metafields_sync = async (req: Request, res: Response) => {
  res.status(202).json({ message: "Stock metafields sync started" });
  runSync().catch((error) => console.error("trabucco_stock_metafields_sync failed", error));
};

const runSync = async () => {
  const client = new GraphQLClient(`https://${TRABUCCO_STORE}/admin/api/${API_VERSION}/graphql.json`, {
    // @ts-ignore
    headers: { "X-Shopify-Access-Token": TRABUCCO_ACCESS_TOKEN },
  });

  const summary = { scanned: 0, updated: 0, errors: [] as any[] };
  let cursor: string | null = null;
  let hasNextPage = true;

  while (hasNextPage) {
    const result: any = await client.request(variantsForSyncQuery, { cursor, locationId: PRUMYSLOVA_LOCATION_ID });
    const edges = result.productVariants.edges;

    for (const edge of edges) {
      const variant = edge.node;
      summary.scanned++;

      const available = variant.inventoryItem?.inventoryLevel?.quantities?.[0]?.quantity ?? 0;

      const metafieldsResult: any = await client.request(metafieldsSetQuery, {
        metafields: [
          { ownerId: variant.id, namespace: "stock", key: "internal", type: "number_integer", value: String(available) },
          { ownerId: variant.id, namespace: "stock", key: "available_in_cz", type: "boolean", value: String(available > 0) },
        ],
      });
      if (metafieldsResult.metafieldsSet.userErrors.length > 0) {
        summary.errors.push({ variantId: variant.id, sku: variant.sku, errors: metafieldsResult.metafieldsSet.userErrors });
      } else {
        summary.updated++;
      }
    }

    hasNextPage = result.productVariants.pageInfo.hasNextPage;
    cursor = result.productVariants.pageInfo.endCursor;
  }

  console.log("trabucco_stock_metafields_sync finished", summary);
};

const variantsForSyncQuery = gql`
  query variantsForSync($cursor: String, $locationId: ID!) {
    productVariants(first: 100, after: $cursor) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id
          sku
          inventoryItem {
            inventoryLevel(locationId: $locationId) {
              quantities(names: ["available"]) {
                quantity
              }
            }
          }
        }
      }
    }
  }
`;

const metafieldsSetQuery = gql`
  mutation metafieldsSet($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields {
        key
        value
      }
      userErrors {
        field
        message
      }
    }
  }
`;
