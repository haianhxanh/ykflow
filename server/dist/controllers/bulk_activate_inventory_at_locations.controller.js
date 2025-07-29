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
        const programsQuery = "tag:Programy OR tag:Monoporce";
        const programs = yield (0, products_1.allProductsQuery)(programsQuery);
        const nonProgramProductsQuery = "tag_not:Programy AND tag_not:Monoporce";
        const nonProgramProducts = yield (0, products_1.allProductsQuery)(nonProgramProductsQuery);
        for (const locationId of locationIds) {
            console.log(`Activating inventory at location ${locationId} ===============================`);
            for (const program of programs) {
                for (const variant of program.node.variants.edges) {
                    const locationActivate = yield client.request(inventory_1.inventoryBulkToggleActivation, {
                        inventoryItemId: variant.node.inventoryItem.id,
                        inventoryItemUpdates: [
                            {
                                locationId: locationId,
                                activate: true,
                            },
                        ],
                    });
                    console.log(variant.node.sku);
                    yield new Promise((resolve) => setTimeout(resolve, 250));
                    if (locationActivate.inventoryBulkToggleActivation.userErrors.length > 0) {
                        console.log(variant.node.inventoryItem.id, locationActivate.inventoryBulkToggleActivation.userErrors);
                    }
                }
            }
            console.log(`Activating inventory at location ${locationId} ===============================`);
            for (const product of nonProgramProducts) {
                for (const variant of product.node.variants.edges) {
                    const locationActivate = yield client.request(inventory_1.inventoryBulkToggleActivation, {
                        inventoryItemId: variant.node.inventoryItem.id,
                        inventoryItemUpdates: [
                            {
                                locationId: locationId,
                                activate: true,
                            },
                        ],
                    });
                    yield new Promise((resolve) => setTimeout(resolve, 200));
                    if (locationActivate.inventoryBulkToggleActivation.userErrors.length > 0) {
                        console.log(variant.node.inventoryItem.id, locationActivate.inventoryBulkToggleActivation.userErrors);
                    }
                    console.log(`Activated inventory at location ${locationId} for variant ${variant.node.sku}`);
                    if (!variant.node.inventoryItem.tracked)
                        continue;
                    if (variant.node.inventoryItem.inventoryLevels.edges[0].node.quantities.quantity == 9999) {
                        continue;
                    }
                    const inventoryQuantities = yield client.request(inventory_1.inventorySetQuantities, {
                        input: {
                            ignoreCompareQuantity: true,
                            name: "available",
                            quantities: [
                                {
                                    inventoryItemId: variant.node.inventoryItem.id,
                                    locationId: locationId,
                                    quantity: 9999,
                                },
                            ],
                            reason: "other",
                        },
                    });
                    yield new Promise((resolve) => setTimeout(resolve, 200));
                    if (inventoryQuantities.inventorySetQuantities.userErrors.length > 0) {
                        console.log(variant.node.inventoryItem.id, inventoryQuantities.inventorySetQuantities.userErrors);
                    }
                    console.log(`Set inventory at location ${locationId} for variant ${variant.node.sku}`);
                    // return res.status(200).json(inventoryQuantities);
                }
            }
        }
        return res.status(200).json({ message: "Inventory activated at all locations" });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal server error" });
    }
});
exports.bulk_activate_inventory_at_locations = bulk_activate_inventory_at_locations;
