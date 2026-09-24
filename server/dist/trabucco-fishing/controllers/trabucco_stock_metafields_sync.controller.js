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
exports.trabucco_stock_metafields_sync = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const graphql_request_1 = require("graphql-request");
dotenv_1.default.config();
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
const trabucco_stock_metafields_sync = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.status(202).json({ message: "Stock metafields sync started" });
    runSync().catch((error) => console.error("trabucco_stock_metafields_sync failed", error));
});
exports.trabucco_stock_metafields_sync = trabucco_stock_metafields_sync;
const runSync = () => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    var _e;
    const client = new graphql_request_1.GraphQLClient(`https://${TRABUCCO_STORE}/admin/api/${API_VERSION}/graphql.json`, {
        // @ts-ignore
        headers: { "X-Shopify-Access-Token": TRABUCCO_ACCESS_TOKEN },
    });
    const summary = { scanned: 0, updated: 0, errors: [] };
    let cursor = null;
    let hasNextPage = true;
    while (hasNextPage) {
        const result = yield client.request(variantsForSyncQuery, { cursor, locationId: PRUMYSLOVA_LOCATION_ID });
        const edges = result.productVariants.edges;
        for (const edge of edges) {
            const variant = edge.node;
            summary.scanned++;
            const available = (_e = (_d = (_c = (_b = (_a = variant.inventoryItem) === null || _a === void 0 ? void 0 : _a.inventoryLevel) === null || _b === void 0 ? void 0 : _b.quantities) === null || _c === void 0 ? void 0 : _c[0]) === null || _d === void 0 ? void 0 : _d.quantity) !== null && _e !== void 0 ? _e : 0;
            const metafieldsResult = yield client.request(metafieldsSetQuery, {
                metafields: [
                    { ownerId: variant.id, namespace: "stock", key: "internal", type: "number_integer", value: String(available) },
                    { ownerId: variant.id, namespace: "stock", key: "available_in_cz", type: "boolean", value: String(available > 0) },
                ],
            });
            if (metafieldsResult.metafieldsSet.userErrors.length > 0) {
                summary.errors.push({ variantId: variant.id, sku: variant.sku, errors: metafieldsResult.metafieldsSet.userErrors });
            }
            else {
                summary.updated++;
            }
        }
        hasNextPage = result.productVariants.pageInfo.hasNextPage;
        cursor = result.productVariants.pageInfo.endCursor;
    }
    console.log("trabucco_stock_metafields_sync finished", summary);
});
const variantsForSyncQuery = (0, graphql_request_1.gql) `
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
