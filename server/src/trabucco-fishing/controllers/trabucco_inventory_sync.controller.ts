import { Request, Response } from "express";
import dotenv from "dotenv";
import { GraphQLClient, gql } from "graphql-request";
import xml_to_js from "xml-js";
import { inventorySetQuantities } from "../../queries/inventory";
dotenv.config();
const { TRABUCCO_STORE, TRABUCCO_ACCESS_TOKEN, API_VERSION } = process.env;

const PRUMYSLOVA_LOCATION_ID = "gid://shopify/Location/72378614056";
const EXTERNI_LOCATION_ID = "gid://shopify/Location/114033066280";
const ONLINE_STORE_PUBLICATION_ID = "gid://shopify/Publication/95134941480";
const DEFAULT_FEED_URL = "https://feeds.mergado.com/trabuccofish-cz-shoptet-kompletni-cz-e3d89b66ad63933bd4ea650efcde3530.xml";

/*-------------------------------------MAIN FUNCTION------------------------------------------------*/
// Fetch Mergado/Shoptet feed, match each item to a Shopify variant by SKU (feed CODE).
// Update inventory at Průmyslová + Externí sklad from the feed's STOCK/WAREHOUSES values.
// VISIBILITY = hidden -> unpublish product from all sales channels
// VISIBILITY = visible -> set product ACTIVE + publish to Online Store
// If update_metafields=true query param is set, also write per-variant metafields based on the
// Průmyslová (CZ/internal) quantity: stock.internal = quantity, stock.available_in_cz = quantity > 0
// Runs in the background: responds immediately, keeps processing after the response is sent,
// since the full feed can take longer than the app's request timeout middleware allows.
/*-------------------------------------MAIN FUNCTION------------------------------------------------*/

export const trabucco_inventory_sync = async (req: Request, res: Response) => {
  const feedUrl = (req.query.feedUrl as string) || DEFAULT_FEED_URL;
  const updateMetafields = req.query.update_metafields === "true";
  res.status(202).json({ message: "Sync started", feedUrl, updateMetafields });
  runSync(feedUrl, updateMetafields).catch((error) => console.error("trabucco_inventory_sync failed", error));
};

const runSync = async (feedUrl: string, updateMetafields: boolean) => {
  const client = new GraphQLClient(`https://${TRABUCCO_STORE}/admin/api/${API_VERSION}/graphql.json`, {
    // @ts-ignore
    headers: { "X-Shopify-Access-Token": TRABUCCO_ACCESS_TOKEN },
  });

  const items = await fetchFeed(feedUrl);
  const processedProducts = new Set<string>();
  const summary = { items: items.length, inventoryUpdated: 0, metafieldsUpdated: 0, notFound: 0, published: 0, unpublished: 0, errors: [] as any[] };

  for (const item of items) {
    const sku = item.CODE?._text;
    if (!sku) continue;

    const found = await client.request(findVariantBySkuQuery, { query: `sku:${sku}` });
    const node = found.productVariants.edges[0]?.node;
    if (!node) {
      summary.notFound++;
      continue;
    }

    const stock = mapStock(item.STOCK);
    const setQuantities = await client.request(inventorySetQuantities, {
      input: {
        ignoreCompareQuantity: true,
        name: "available",
        reason: "correction",
        quantities: [
          { inventoryItemId: node.inventoryItem.id, locationId: PRUMYSLOVA_LOCATION_ID, quantity: stock.prumyslova },
          { inventoryItemId: node.inventoryItem.id, locationId: EXTERNI_LOCATION_ID, quantity: stock.externi },
        ],
      },
    });
    if (setQuantities.inventorySetQuantities.userErrors.length > 0) {
      summary.errors.push({ sku, step: "inventory", errors: setQuantities.inventorySetQuantities.userErrors });
    } else {
      summary.inventoryUpdated++;
    }

    if (updateMetafields) {
      const metafieldsResult = await client.request(metafieldsSetQuery, {
        metafields: [
          { ownerId: node.id, namespace: "stock", key: "internal", type: "number_integer", value: String(stock.prumyslova) },
          { ownerId: node.id, namespace: "stock", key: "available_in_cz", type: "boolean", value: String(stock.prumyslova > 0) },
          { ownerId: node.id, namespace: "stock", key: "external", type: "number_integer", value: String(stock.externi) },
        ],
      });
      if (metafieldsResult.metafieldsSet.userErrors.length > 0) {
        summary.errors.push({ sku, step: "metafields", errors: metafieldsResult.metafieldsSet.userErrors });
      } else {
        summary.metafieldsUpdated++;
      }
    }

    const productGid = node.product.id;
    const visibility = item.VISIBILITY?._text;
    if (processedProducts.has(productGid) || !visibility) continue;
    processedProducts.add(productGid);

    if (visibility === "hidden") {
      const unpub = await client.request(publishableUnpublishQuery, { id: productGid, input: [{ publicationId: ONLINE_STORE_PUBLICATION_ID }] });
      if (unpub.publishableUnpublish.userErrors.length > 0) {
        summary.errors.push({ productGid, step: "unpublish", errors: unpub.publishableUnpublish.userErrors });
      } else {
        summary.unpublished++;
      }
    } else if (visibility === "visible") {
      const statusUpdate = await client.request(productUpdateStatusQuery, { input: { id: productGid, status: "ACTIVE" } });
      if (statusUpdate.productUpdate.userErrors.length > 0) {
        summary.errors.push({ productGid, step: "status", errors: statusUpdate.productUpdate.userErrors });
      }
      const pub = await client.request(publishablePublishQuery, { id: productGid, input: [{ publicationId: ONLINE_STORE_PUBLICATION_ID }] });
      if (pub.publishablePublish.userErrors.length > 0) {
        summary.errors.push({ productGid, step: "publish", errors: pub.publishablePublish.userErrors });
      } else {
        summary.published++;
      }
    }
  }

  console.log("trabucco_inventory_sync finished", summary);
};

const findVariantBySkuQuery = gql`
  query findVariantBySku($query: String!) {
    productVariants(first: 1, query: $query) {
      edges {
        node {
          id
          inventoryItem {
            id
          }
          product {
            id
          }
        }
      }
    }
  }
`;

const productUpdateStatusQuery = gql`
  mutation productUpdateStatus($input: ProductInput!) {
    productUpdate(input: $input) {
      product {
        id
        status
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const publishablePublishQuery = gql`
  mutation publish($id: ID!, $input: [PublicationInput!]!) {
    publishablePublish(id: $id, input: $input) {
      userErrors {
        field
        message
      }
    }
  }
`;

const publishableUnpublishQuery = gql`
  mutation unpublish($id: ID!, $input: [PublicationInput!]!) {
    publishableUnpublish(id: $id, input: $input) {
      userErrors {
        field
        message
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

const fetchFeed = async (feedUrl: string) => {
  const response = await fetch(feedUrl, {
    method: "GET",
    headers: { "Content-Type": "text/xml" },
  })
    .then((r: any) => r.text())
    .then((xml: any) => xml_to_js.xml2js(xml, { compact: true }) as any);
  const items = response?.SHOP?.SHOPITEM;
  return Array.isArray(items) ? items : [items].filter(Boolean);
};

const mapStock = (stock: any) => {
  const warehouses = stock?.WAREHOUSES?.WAREHOUSE;
  const list = Array.isArray(warehouses) ? warehouses : [warehouses].filter(Boolean);
  let prumyslova = 0;
  let externi = 0;
  for (const wh of list) {
    const name = wh?.NAME?._text;
    const value = Number(wh?.VALUE?._text ?? 0);
    if (name === "Průmyslová") prumyslova = value;
    if (name === "Externí sklad") externi = value;
  }
  return { prumyslova, externi };
};
