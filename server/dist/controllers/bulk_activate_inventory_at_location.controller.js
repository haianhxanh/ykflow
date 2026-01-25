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
exports.bulk_activate_inventory_at_location = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const graphql_request_1 = require("graphql-request");
const products_1 = require("../queries/products");
const inventory_1 = require("../queries/inventory");
dotenv_1.default.config();
const { ACCESS_TOKEN, STORE, API_VERSION } = process.env;
/*----------------------------------- FEATURE DESCRIPTION -------------------------------------------*/
// When adding a new pickup location to the store, the inventory is not activated at the new location.
// This script will bulk activate the inventory at the new location for selected products.
// Specify the following in the script (possibly to move them to query parameters later):
// - location id
// - product query (e.g. tag:Programy)
/*-------------------------------------MAIN FUNCTION------------------------------------------------*/
const bulk_activate_inventory_at_location = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const client = new graphql_request_1.GraphQLClient(`https://${STORE}/admin/api/${API_VERSION}/graphql.json`, {
            // @ts-ignore
            headers: {
                "X-Shopify-Access-Token": ACCESS_TOKEN,
            },
        });
        const locationId = req.query.locationId;
        const query = req.query.query;
        const products = yield (0, products_1.allProductsQuery)(query || "");
        console.log(`Total products to process: ${products.length}`);
        res.status(202).json({
            message: "Processing started",
            totalProducts: products.length,
            locationId: locationId,
        });
        const progress = {
            totalProducts: products.length,
            processedProducts: 0,
            processedVariants: 0,
            errors: [],
        };
        for (let productIndex = 0; productIndex < products.length; productIndex++) {
            const product = products[productIndex];
            for (const variant of product.node.variants.edges) {
                try {
                    const locationActivate = yield client.request(inventory_1.inventoryBulkToggleActivation, {
                        inventoryItemId: variant.node.inventoryItem.id,
                        inventoryItemUpdates: [
                            {
                                locationId: `gid://shopify/Location/${locationId}`,
                                activate: true,
                            },
                        ],
                    });
                    console.log(variant.node.sku ? variant.node.sku : variant.node.title);
                    progress.processedVariants++;
                    yield new Promise((resolve) => setTimeout(resolve, 100));
                    if (locationActivate.inventoryBulkToggleActivation.userErrors.length > 0) {
                        const errorInfo = {
                            inventoryItemId: variant.node.inventoryItem.id,
                            errors: locationActivate.inventoryBulkToggleActivation.userErrors,
                        };
                        progress.errors.push(errorInfo);
                        console.log(variant.node.inventoryItem.id, locationActivate.inventoryBulkToggleActivation.userErrors);
                    }
                }
                catch (variantError) {
                    console.error(`Error processing variant ${variant.node.inventoryItem.id}:`, variantError);
                    progress.errors.push({
                        inventoryItemId: variant.node.inventoryItem.id,
                        errors: [{ message: String(variantError) }],
                    });
                }
            }
            progress.processedProducts++;
            console.log(`Progress: ${progress.processedProducts}/${progress.totalProducts} products completed`);
        }
        console.log("=== Processing Completed ===");
        console.log(`Total products: ${progress.totalProducts}`);
        console.log(`Processed products: ${progress.processedProducts}`);
        console.log(`Processed variants: ${progress.processedVariants}`);
        console.log(`Errors: ${progress.errors.length}`);
        if (progress.errors.length > 0) {
            console.log("Error details:", progress.errors);
        }
    }
    catch (error) {
        console.error("Error during background processing:", error);
    }
});
exports.bulk_activate_inventory_at_location = bulk_activate_inventory_at_location;
