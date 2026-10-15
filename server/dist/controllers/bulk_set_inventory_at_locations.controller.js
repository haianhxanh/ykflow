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
exports.bulk_set_inventory_at_locations = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const graphql_request_1 = require("graphql-request");
const products_1 = require("../queries/products");
const inventory_1 = require("../queries/inventory");
const locations_1 = require("../queries/locations");
const variants_1 = require("../queries/variants");
dotenv_1.default.config();
const { ACCESS_TOKEN, STORE, API_VERSION } = process.env;
// Max (inventory item, location) pairs sent in one inventorySetQuantities call
const QUANTITIES_BATCH_SIZE = 250;
/*-------------------------------------MAIN FUNCTION------------------------------------------------*/
const bulk_set_inventory_at_locations = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const client = new graphql_request_1.GraphQLClient(`https://${STORE}/admin/api/${API_VERSION}/graphql.json`, {
            // @ts-ignore
            headers: {
                "X-Shopify-Access-Token": ACCESS_TOKEN,
            },
        });
        const locations = yield client.request(locations_1.locationsQuery);
        const locationIds = locations.locations.edges.map((location) => location.node.id);
        const inventoryItemUpdates = locationIds.map((locationId) => ({ locationId, activate: true }));
        const allProducts = yield (0, products_1.allProductsQuery)("tag:Programy");
        // Quantities are collected across variants and locations and sent in batches
        let pendingQuantities = [];
        const flushQuantities = () => __awaiter(void 0, void 0, void 0, function* () {
            if (pendingQuantities.length === 0)
                return;
            const batch = pendingQuantities;
            pendingQuantities = [];
            const inventoryQuantities = yield client.request(inventory_1.inventorySetQuantities, {
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
            yield new Promise((resolve) => setTimeout(resolve, 100));
            console.log(`Inventory quantity set to 0 for ${batch.length} variant/location pairs`);
        });
        console.log(`Setting inventory at ${locationIds.length} locations ===============================`);
        for (const [productIndex, product] of allProducts.entries()) {
            console.log(`Processing product ${productIndex + 1}/${allProducts.length}`);
            for (const variant of product.node.variants.edges) {
                // 1. Activate inventory at all locations
                const locationActivate = yield client.request(inventory_1.inventoryBulkToggleActivation, {
                    inventoryItemId: variant.node.inventoryItem.id,
                    inventoryItemUpdates,
                });
                console.log("Variant SKU: ", variant.node.sku);
                if (locationActivate.inventoryBulkToggleActivation.userErrors.length > 0) {
                    console.log(`Error Activating inventory at locations for variant ${variant.node.inventoryItem.id}`, locationActivate.inventoryBulkToggleActivation.userErrors);
                }
                yield new Promise((resolve) => setTimeout(resolve, 100));
                // 2. Enable Track quantity (per inventory item, not per location)
                const trackQuantity = yield client.request(inventory_1.inventoryItemUpdate, {
                    id: variant.node.inventoryItem.id,
                    input: {
                        tracked: true,
                    },
                });
                if (trackQuantity.inventoryItemUpdate.userErrors.length > 0) {
                    console.log(`Error enabling Track quantity for variant ${variant.node.inventoryItem.id}`, trackQuantity.inventoryItemUpdate.userErrors);
                }
                yield new Promise((resolve) => setTimeout(resolve, 100));
            }
            // 3. Enable Continue selling for all variants of the product at once
            const continueSelling = yield client.request(variants_1.productVariantsBulkUpdate, {
                productId: product.node.id,
                variants: product.node.variants.edges.map((variant) => ({
                    id: variant.node.id,
                    inventoryPolicy: "CONTINUE",
                })),
            });
            if (continueSelling.productVariantsBulkUpdate.userErrors.length > 0) {
                console.log(`Error enabling Continue selling for product ${product.node.id}`, continueSelling.productVariantsBulkUpdate.userErrors);
            }
            yield new Promise((resolve) => setTimeout(resolve, 100));
            // 4. Queue Inventory quantity 0 at all locations (sent in batches)
            for (const variant of product.node.variants.edges) {
                for (const locationId of locationIds) {
                    pendingQuantities.push({ inventoryItemId: variant.node.inventoryItem.id, locationId, quantity: 0 });
                    if (pendingQuantities.length >= QUANTITIES_BATCH_SIZE)
                        yield flushQuantities();
                }
            }
            console.log(`Inventory updated for product ${product.node.id} at ${locationIds.length} locations`);
        }
        yield flushQuantities();
        return res.status(200).json({ message: "Inventory activated at all locations" });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal server error" });
    }
});
exports.bulk_set_inventory_at_locations = bulk_set_inventory_at_locations;
