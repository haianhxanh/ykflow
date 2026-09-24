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
exports.trabucco_catalog_variant_sync = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const graphql_request_1 = require("graphql-request");
dotenv_1.default.config();
const { TRABUCCO_STORE, TRABUCCO_ACCESS_TOKEN } = process.env;
// Variant-level publishing (ProductVariant as Publishable) needs API 2026-07+; the rest of the
// Trabucco codebase is pinned to API_VERSION=2025-01, so this endpoint uses its own version
// rather than bumping the shared one.
const API_VERSION = "2026-07";
const PRUMYSLOVA_LOCATION_ID = "gid://shopify/Location/72378614056";
const B2C_CATALOG_PUBLICATION_ID = "gid://shopify/Publication/312649089320"; // Catalog "B2C" (161522811176)
/*-------------------------------------MAIN FUNCTION------------------------------------------------*/
// One-off / periodically-triggerable sync: for every product variant, check its available
// inventory at the Průmyslová location. If available <= 0, unpublish the VARIANT (not the whole
// product) from the B2C catalog publication. If available > 0, publish the variant back into it.
// Only the variant's publication state changes -- product-level status/publication is untouched.
// Runs in the background: responds immediately, keeps processing after the response is sent,
// since a full sweep of ~7,600 variants exceeds the app's request timeout middleware.
/*-------------------------------------MAIN FUNCTION------------------------------------------------*/
const trabucco_catalog_variant_sync = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    res.status(202).json({ message: "Catalog variant sync started" });
    runSync().catch((error) => console.error("trabucco_catalog_variant_sync failed", error));
});
exports.trabucco_catalog_variant_sync = trabucco_catalog_variant_sync;
const runSync = () => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    var _e;
    const client = new graphql_request_1.GraphQLClient(`https://${TRABUCCO_STORE}/admin/api/${API_VERSION}/graphql.json`, {
        // @ts-ignore
        headers: { "X-Shopify-Access-Token": TRABUCCO_ACCESS_TOKEN },
    });
    const summary = { scanned: 0, published: 0, unpublished: 0, alreadyCorrect: 0, errors: [] };
    let cursor = null;
    let hasNextPage = true;
    while (hasNextPage) {
        const result = yield client.request(variantsForSyncQuery, { cursor, locationId: PRUMYSLOVA_LOCATION_ID });
        const edges = result.productVariants.edges;
        for (const edge of edges) {
            const variant = edge.node;
            summary.scanned++;
            const level = (_a = variant.inventoryItem) === null || _a === void 0 ? void 0 : _a.inventoryLevel;
            const available = (_e = (_c = (_b = level === null || level === void 0 ? void 0 : level.quantities) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.quantity) !== null && _e !== void 0 ? _e : 0;
            // The B2C catalog publication has autoPublish=true: every variant is published by default
            // with no explicit resourcePublicationsV2 record until someone overrides it. So "no record
            // found" means "implicitly published", not "unpublished" -- defaulting to false here would
            // silently skip unpublishing out-of-stock variants that have never been touched before.
            const pub = (((_d = variant.resourcePublicationsV2) === null || _d === void 0 ? void 0 : _d.edges) || []).find((e) => e.node.publication.id === B2C_CATALOG_PUBLICATION_ID);
            const currentlyPublished = pub ? pub.node.isPublished : true;
            const shouldBePublished = available > 0;
            if (shouldBePublished === currentlyPublished) {
                summary.alreadyCorrect++;
                continue;
            }
            if (shouldBePublished) {
                const pubResult = yield client.request(publishablePublishQuery, {
                    id: variant.id,
                    input: [{ publicationId: B2C_CATALOG_PUBLICATION_ID }],
                });
                if (pubResult.publishablePublish.userErrors.length > 0) {
                    summary.errors.push({ variantId: variant.id, sku: variant.sku, step: "publish", errors: pubResult.publishablePublish.userErrors });
                }
                else {
                    summary.published++;
                }
            }
            else {
                const unpubResult = yield client.request(publishableUnpublishQuery, {
                    id: variant.id,
                    input: [{ publicationId: B2C_CATALOG_PUBLICATION_ID }],
                });
                if (unpubResult.publishableUnpublish.userErrors.length > 0) {
                    summary.errors.push({ variantId: variant.id, sku: variant.sku, step: "unpublish", errors: unpubResult.publishableUnpublish.userErrors });
                }
                else {
                    summary.unpublished++;
                }
            }
        }
        hasNextPage = result.productVariants.pageInfo.hasNextPage;
        cursor = result.productVariants.pageInfo.endCursor;
    }
    console.log("trabucco_catalog_variant_sync finished", summary);
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
          resourcePublicationsV2(first: 10) {
            edges {
              node {
                publication {
                  id
                }
                isPublished
              }
            }
          }
        }
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
