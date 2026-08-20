"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.trabucco_inventory_sync = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const graphql_request_1 = require("graphql-request");
const xml_js_1 = __importDefault(require("xml-js"));
const inventory_1 = require("../../queries/inventory");
dotenv_1.default.config();
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
const trabucco_inventory_sync = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const feedUrl = req.query.feedUrl || DEFAULT_FEED_URL;
    const updateMetafields = req.query.update_metafields === "true";
    res.status(202).json({ message: "Sync started", feedUrl, updateMetafields });
    runSync(feedUrl, updateMetafields).catch((error) => console.error("trabucco_inventory_sync failed", error));
});
exports.trabucco_inventory_sync = trabucco_inventory_sync;
const runSync = (feedUrl, updateMetafields) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    const client = new graphql_request_1.GraphQLClient(`https://${TRABUCCO_STORE}/admin/api/${API_VERSION}/graphql.json`, {
        // @ts-ignore
        headers: { "X-Shopify-Access-Token": TRABUCCO_ACCESS_TOKEN },
    });
    const items = yield fetchFeed(feedUrl);
    const processedProducts = new Set();
    const summary = { items: items.length, inventoryUpdated: 0, metafieldsUpdated: 0, notFound: 0, published: 0, unpublished: 0, errors: [] };
    for (const item of items) {
        const sku = (_a = item.CODE) === null || _a === void 0 ? void 0 : _a._text;
        if (!sku)
            continue;
        const found = yield client.request(findVariantBySkuQuery, { query: `sku:${sku}` });
        const node = (_b = found.productVariants.edges[0]) === null || _b === void 0 ? void 0 : _b.node;
        if (!node) {
            summary.notFound++;
            continue;
        }
        const stock = mapStock(item.STOCK);
        const setQuantities = yield client.request(inventory_1.inventorySetQuantities, {
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
        }
        else {
            summary.inventoryUpdated++;
        }
        if (updateMetafields) {
            const metafieldsResult = yield client.request(metafieldsSetQuery, {
                metafields: [
                    { ownerId: node.id, namespace: "stock", key: "internal", type: "number_integer", value: String(stock.prumyslova) },
                    { ownerId: node.id, namespace: "stock", key: "available_in_cz", type: "boolean", value: String(stock.prumyslova > 0) },
                ],
            });
            if (metafieldsResult.metafieldsSet.userErrors.length > 0) {
                summary.errors.push({ sku, step: "metafields", errors: metafieldsResult.metafieldsSet.userErrors });
            }
            else {
                summary.metafieldsUpdated++;
            }
        }
        const productGid = node.product.id;
        const visibility = (_c = item.VISIBILITY) === null || _c === void 0 ? void 0 : _c._text;
        if (processedProducts.has(productGid) || !visibility)
            continue;
        processedProducts.add(productGid);
        if (visibility === "hidden") {
            const unpub = yield client.request(publishableUnpublishQuery, { id: productGid, input: [{ publicationId: ONLINE_STORE_PUBLICATION_ID }] });
            if (unpub.publishableUnpublish.userErrors.length > 0) {
                summary.errors.push({ productGid, step: "unpublish", errors: unpub.publishableUnpublish.userErrors });
            }
            else {
                summary.unpublished++;
            }
        }
        else if (visibility === "visible") {
            const statusUpdate = yield client.request(productUpdateStatusQuery, { input: { id: productGid, status: "ACTIVE" } });
            if (statusUpdate.productUpdate.userErrors.length > 0) {
                summary.errors.push({ productGid, step: "status", errors: statusUpdate.productUpdate.userErrors });
            }
            const pub = yield client.request(publishablePublishQuery, { id: productGid, input: [{ publicationId: ONLINE_STORE_PUBLICATION_ID }] });
            if (pub.publishablePublish.userErrors.length > 0) {
                summary.errors.push({ productGid, step: "publish", errors: pub.publishablePublish.userErrors });
            }
            else {
                summary.published++;
            }
        }
    }
    console.log("trabucco_inventory_sync finished", summary);
});
const findVariantBySkuQuery = (0, graphql_request_1.gql) `
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
const productUpdateStatusQuery = (0, graphql_request_1.gql) `
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
const publishablePublishQuery = (0, graphql_request_1.gql) `
  mutation publish($id: ID!, $input: [PublicationInput!]!) {
    publishablePublish(id: $id, input: $input) {
      userErrors {
        field
        message
      }
    }
  }
`;
const publishableUnpublishQuery = (0, graphql_request_1.gql) `
  mutation unpublish($id: ID!, $input: [PublicationInput!]!) {
    publishableUnpublish(id: $id, input: $input) {
      userErrors {
        field
        message
      }
    }
  }
`;
const metafieldsSetQuery = (0, graphql_request_1.gql) `
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
const fetchFeed = (feedUrl) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const response = yield fetch(feedUrl, {
        method: "GET",
        headers: { "Content-Type": "text/xml" },
    })
        .then((r) => r.text())
        .then((xml) => xml_js_1.default.xml2js(xml, { compact: true }));
    const items = (_a = response === null || response === void 0 ? void 0 : response.SHOP) === null || _a === void 0 ? void 0 : _a.SHOPITEM;
    return Array.isArray(items) ? items : [items].filter(Boolean);
});
const mapStock = (stock) => {
    var _a, _b, _c;
    var _d;
    const warehouses = (_a = stock === null || stock === void 0 ? void 0 : stock.WAREHOUSES) === null || _a === void 0 ? void 0 : _a.WAREHOUSE;
    const list = Array.isArray(warehouses) ? warehouses : [warehouses].filter(Boolean);
    let prumyslova = 0;
    let externi = 0;
    for (const wh of list) {
        const name = (_b = wh === null || wh === void 0 ? void 0 : wh.NAME) === null || _b === void 0 ? void 0 : _b._text;
        const value = Number((_d = (_c = wh === null || wh === void 0 ? void 0 : wh.VALUE) === null || _c === void 0 ? void 0 : _c._text) !== null && _d !== void 0 ? _d : 0);
        if (name === "Průmyslová")
            prumyslova = value;
        if (name === "Externí sklad")
            externi = value;
    }
    return { prumyslova, externi };
};
