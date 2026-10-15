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
exports.bulk_activate_inventory_at_locations = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const graphql_request_1 = require("graphql-request");
const products_1 = require("../queries/products");
const inventory_1 = require("../queries/inventory");
const locations_1 = require("../queries/locations");
dotenv_1.default.config();
const { ACCESS_TOKEN, STORE, API_VERSION } = process.env;
// Max (inventory item, location) pairs sent in one inventorySetQuantities call
const QUANTITIES_BATCH_SIZE = 250;
/*-------------------------------------MAIN FUNCTION------------------------------------------------*/
const bulk_activate_inventory_at_locations = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const client = new graphql_request_1.GraphQLClient(`https://${STORE}/admin/api/${API_VERSION}/graphql.json`, {
            // @ts-ignore
            headers: {
                "X-Shopify-Access-Token": ACCESS_TOKEN,
            },
        });
        const locations = yield client.request(locations_1.locationsQuery);
        const locationIds = locations.locations.edges.map((location) => location.node.id);
        // Each variant is activated at all locations in a single request
        const inventoryItemUpdates = locationIds.map((locationId) => ({ locationId, activate: true }));
        const programsQuery = "tag:Programy OR tag:Monoporce";
        const programs = yield (0, products_1.allProductsQuery)(programsQuery);
        const nonProgramProductsQuery = "tag_not:Programy AND tag_not:Monoporce";
        const nonProgramProducts = yield (0, products_1.allProductsQuery)(nonProgramProductsQuery);
        const activateAtAllLocations = (variant) => __awaiter(void 0, void 0, void 0, function* () {
            const locationActivate = yield client.request(inventory_1.inventoryBulkToggleActivation, {
                inventoryItemId: variant.node.inventoryItem.id,
                inventoryItemUpdates,
            });
            yield new Promise((resolve) => setTimeout(resolve, 200));
            if (locationActivate.inventoryBulkToggleActivation.userErrors.length > 0) {
                console.log(variant.node.inventoryItem.id, locationActivate.inventoryBulkToggleActivation.userErrors);
            }
            console.log(`Activated inventory at ${locationIds.length} locations for variant ${variant.node.sku}`);
        });
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
            yield new Promise((resolve) => setTimeout(resolve, 200));
            if (inventoryQuantities.inventorySetQuantities.userErrors.length > 0) {
                console.log("Error setting inventory quantities", inventoryQuantities.inventorySetQuantities.userErrors);
            }
            console.log(`Set inventory for ${batch.length} variant/location pairs`);
        });
        console.log(`Activating programs at ${locationIds.length} locations ===============================`);
        for (const program of programs) {
            for (const variant of program.node.variants.edges) {
                yield activateAtAllLocations(variant);
            }
        }
        console.log(`Activating non-program products at ${locationIds.length} locations ===============================`);
        for (const product of nonProgramProducts) {
            for (const variant of product.node.variants.edges) {
                yield activateAtAllLocations(variant);
                if (!variant.node.inventoryItem.tracked)
                    continue;
                for (const locationId of locationIds) {
                    pendingQuantities.push({ inventoryItemId: variant.node.inventoryItem.id, locationId, quantity: 9999 });
                    if (pendingQuantities.length >= QUANTITIES_BATCH_SIZE)
                        yield flushQuantities();
                }
            }
        }
        yield flushQuantities();
        return res.status(200).json({ message: "Inventory activated at all locations" });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal server error" });
    }
});
exports.bulk_activate_inventory_at_locations = bulk_activate_inventory_at_locations;
