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
exports.brainmarkets_products_import = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const graphql_request_1 = require("graphql-request");
const products_1 = require("../queries/products");
const inventory_1 = require("../queries/inventory");
const locations_1 = require("../queries/locations");
const variants_1 = require("../queries/variants");
const xml_js_1 = __importDefault(require("xml-js"));
const fs_1 = __importDefault(require("fs"));
dotenv_1.default.config();
const { ACCESS_TOKEN, STORE, API_VERSION } = process.env;
const COLLECTION_VAT_12_DPH = "gid://shopify/Collection/390902710501";
/*-------------------------------------MAIN FUNCTION------------------------------------------------*/
// Fetch all products from XML file
// Load preferred products to be imported (CSV file)
// Log not found products into file
// Get products, check for variants
// Check if product already exists
// Create new products as DRAFT, with tag BrainMarket
// Add products with 12% tax to dedicated collection
// Activate product variants at all locations
// Update variants inventory policy to CONTINUE
// Update variants inventory quantity to 0
/*-------------------------------------MAIN FUNCTION------------------------------------------------*/
const brainmarkets_products_import = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const xmlUrl = req.query.xmlUrl;
        const preferredItemsFilePath = req.query.preferredItemsFilePath;
        const client = new graphql_request_1.GraphQLClient(`https://${STORE}/admin/api/${API_VERSION}/graphql.json`, {
            // @ts-ignore
            headers: {
                "X-Shopify-Access-Token": ACCESS_TOKEN,
            },
        });
        // fetch all products from XML file
        const items = yield fetchProductsFromXml(xmlUrl);
        const mappedItems = mapItems(items);
        const preferredItems = preferredItemsFilePath ? readPreferredItemsFromCsv(preferredItemsFilePath) : null;
        console.log("loaded preferred products", preferredItems === null || preferredItems === void 0 ? void 0 : preferredItems.length);
        let itemsToImport = preferredItems ? mappedItems.filter((item) => preferredItems.includes(item.title)) : mappedItems;
        console.log("items to import", itemsToImport.length);
        // const missingItems = preferredItems.filter((item: any) => !itemsToImport.some((i: any) => i.title === item));
        // console.log("missing items", missingItems.length);
        const products = createProductObjects(itemsToImport);
        const variants = createVariantObjects(itemsToImport);
        const locations = yield client.request(locations_1.locationsQuery);
        const locationIds = locations.locations.edges.map((location) => location.node.id);
        for (const product of products) {
            const productExists = yield client.request(products_1.productsQuery, {
                query: `title:${product.product.title}`,
            });
            if (productExists.products.edges.length > 0) {
                console.log("product already exists", product.product.title);
                continue;
            }
            const hasVariants = variants[product.product.title].length > 1;
            const productObject = {
                input: product.product,
                media: product.media,
            };
            const newProduct = yield client.request(products_1.productCreateQuery, productObject);
            if (newProduct.productCreate.userErrors.length > 0) {
                console.error(newProduct.productCreate.userErrors);
                continue;
            }
            const newProductId = newProduct.productCreate.product.id;
            if (hasVariants) {
                const variantsToImport = variants[product.product.title];
                yield createVariants(client, variantsToImport, newProductId, variantsToImport.length > 1, locationIds);
            }
            else {
                // Set track to true
                const matchingVariant = (_a = variants[product.product.title]) === null || _a === void 0 ? void 0 : _a[0];
                yield trackVariantInventory(client, newProductId, matchingVariant, newProduct.productCreate.product.variants.edges[0].node.id);
                // Activate inventory item at all locations
                const inventoryItemId = newProduct.productCreate.product.variants.edges[0].node.inventoryItem.id;
                yield activateInventory(client, inventoryItemId, locationIds);
                // Set inventory quantity to 0 at all locations
                const setInventoryQuantity = yield client.request(inventory_1.inventorySetQuantities, {
                    input: {
                        ignoreCompareQuantity: true,
                        name: "available",
                        quantities: locationIds.map((locationId) => ({
                            inventoryItemId: inventoryItemId,
                            locationId,
                            quantity: 0,
                        })),
                        reason: "other",
                    },
                });
                if (setInventoryQuantity.inventorySetQuantities.userErrors.length > 0) {
                    console.error(setInventoryQuantity.inventorySetQuantities.userErrors);
                }
                yield new Promise((resolve) => setTimeout(resolve, 500));
                console.log("product created", product.product.title);
            }
        }
        return res.status(200).json({ variants });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal server error" });
    }
});
exports.brainmarkets_products_import = brainmarkets_products_import;
const fetchProductsFromXml = (xmlUrl) => __awaiter(void 0, void 0, void 0, function* () {
    var _b;
    const response = yield fetch(xmlUrl, {
        method: "GET",
        headers: {
            "Content-Type": "text/xml",
        },
    })
        .then(function (response) {
        return response.text();
    })
        .then(function (xml) {
        var json_result = xml_js_1.default.xml2js(xml, { compact: true });
        return json_result;
    });
    return (_b = response === null || response === void 0 ? void 0 : response.SHOP) === null || _b === void 0 ? void 0 : _b.SHOPITEM;
});
const mapItems = (items) => {
    return items.map((item) => {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
        return {
            title: (_a = item.PRODUCTNAME) === null || _a === void 0 ? void 0 : _a._text,
            descriptionHtml: (_b = item.DESCRIPTION) === null || _b === void 0 ? void 0 : _b._text,
            shortDescription: (_c = item.shortDescription) === null || _c === void 0 ? void 0 : _c._text,
            price: (_d = item.PRICE_VAT) === null || _d === void 0 ? void 0 : _d._text,
            vat: (_e = item.VAT) === null || _e === void 0 ? void 0 : _e._text,
            sku: "NP" + ((_f = item.ITEM_ID) === null || _f === void 0 ? void 0 : _f._text),
            ean: (_g = item.EAN) === null || _g === void 0 ? void 0 : _g._text,
            groupId: (_h = item.ITEMGROUP_ID) === null || _h === void 0 ? void 0 : _h._text,
            optionName: (_k = (_j = item.PARAM) === null || _j === void 0 ? void 0 : _j.PARAM_NAME) === null || _k === void 0 ? void 0 : _k._text,
            optionValue: (_m = (_l = item.PARAM) === null || _l === void 0 ? void 0 : _l.VAL) === null || _m === void 0 ? void 0 : _m._text,
            mainImage: (_o = item.IMGURL) === null || _o === void 0 ? void 0 : _o._text,
            images: Array.isArray(item.IMGURL_ALTERNATIVE) ? item.IMGURL_ALTERNATIVE.map((image) => image._text).filter((url) => url != null) : [],
            vendor: "BrainMarket",
        };
    });
};
const readPreferredItemsFromCsv = (preferredItemsFilePath) => {
    const preferredItems = fs_1.default.readFileSync(preferredItemsFilePath, "utf8");
    return preferredItems.split("\n").map((item) => item.trim());
};
const createProductObjects = (items) => {
    const products = [];
    for (const item of items) {
        // if products has input with same title ignore
        if (products.some((product) => product.product.title === item.title)) {
            continue;
        }
        const allMedia = [item.mainImage, ...item.images];
        const input = {
            product: {
                title: item.title,
                descriptionHtml: item.descriptionHtml,
                collectionsToJoin: item.vat == "12" ? [COLLECTION_VAT_12_DPH] : [],
                vendor: item.vendor,
                tags: ["BrainMarket"],
                status: "DRAFT",
                seo: {
                    title: item.title,
                    description: item.shortDescription,
                },
            },
            media: allMedia.map((url) => ({
                mediaContentType: "IMAGE",
                originalSource: url,
            })),
        };
        if (item.vat == "12") {
            input.product.tags.push("DPH 12%");
        }
        products.push(input);
    }
    return products;
};
const createVariantObjects = (items) => {
    const variants = [];
    for (const item of items) {
        const variant = {
            productTitle: item.title,
            barcode: item.ean,
            price: item.price,
            inventoryPolicy: "CONTINUE",
            inventoryItem: {
                tracked: true,
                measurement: {
                    weight: {
                        unit: "KILOGRAMS",
                        value: 1,
                    },
                },
                sku: item.sku,
            },
            optionValues: [],
        };
        if (item.groupId) {
            variant.optionValues.push({
                optionName: item.optionName,
                name: item.optionValue,
            });
        }
        variants.push(variant);
    }
    const groupedVariants = variants.reduce((acc, variant) => {
        const title = variant.productTitle;
        if (!acc[title]) {
            acc[title] = [];
        }
        acc[title].push(variant);
        return acc;
    }, {});
    return groupedVariants;
};
const createVariants = (client, variants, newProductId, withOptionValues, locationIds) => __awaiter(void 0, void 0, void 0, function* () {
    const createdOption = withOptionValues
        ? yield client.request(products_1.productOptionsCreateQuery, {
            options: {
                name: variants[0].optionValues[0].optionName,
                values: [
                    {
                        name: "Initial",
                    },
                ],
            },
            productId: newProductId,
        })
        : null;
    const initialVariantId = withOptionValues ? createdOption.productOptionsCreate.product.variants.edges[0].node.id : null;
    for (const variant of variants) {
        const newVariant = yield client.request(variants_1.productVariantsBulkCreateQuery, {
            productId: newProductId,
            variants: [
                {
                    barcode: variant.barcode,
                    inventoryItem: variant.inventoryItem,
                    price: variant.price,
                    sku: variant.sku,
                    inventoryPolicy: variant.inventoryPolicy,
                    inventoryQuantities: locationIds.map((locationId) => ({
                        locationId,
                        availableQuantity: 0,
                    })),
                    optionValues: variant.optionValues.length > 0
                        ? variant.optionValues.map((option) => ({
                            optionName: option.optionName,
                            name: option.name,
                        }))
                        : [
                            {
                                optionName: "Title",
                                name: "Default Title",
                            },
                        ],
                },
            ],
        });
        if (newVariant.productVariantsBulkCreate.userErrors.length > 0) {
            console.error(newVariant.productVariantsBulkCreate.userErrors);
        }
    }
    // remove initial variant
    if (initialVariantId) {
        yield client.request(variants_1.productVariantDeleteQuery, {
            productId: newProductId,
            variantsIds: [initialVariantId],
        });
    }
    return "ok";
});
const trackVariantInventory = (client, productId, variant, variantId) => __awaiter(void 0, void 0, void 0, function* () {
    const enableTrackInventory = yield client.request(variants_1.productVariantUpdateQuery, {
        productId: productId,
        variants: [
            {
                id: variantId,
                barcode: variant.barcode,
                price: variant.price,
                inventoryPolicy: "CONTINUE",
                inventoryItem: {
                    tracked: true,
                    sku: variant.inventoryItem.sku,
                    measurement: {
                        weight: {
                            unit: "KILOGRAMS",
                            value: 1,
                        },
                    },
                },
            },
        ],
    });
    if (enableTrackInventory.productVariantsBulkUpdate.userErrors.length > 0) {
        console.error(enableTrackInventory.productVariantsBulkUpdate.userErrors);
    }
    return enableTrackInventory;
});
const activateInventory = (client, inventoryItemId, locationIds) => __awaiter(void 0, void 0, void 0, function* () {
    const bulkUpdateInventory = yield client.request(inventory_1.inventoryBulkToggleActivation, {
        inventoryItemId: inventoryItemId,
        inventoryItemUpdates: locationIds.map((locationId) => ({
            activate: true,
            locationId,
        })),
    });
    if (bulkUpdateInventory.inventoryBulkToggleActivation.userErrors.length > 0) {
        console.error(bulkUpdateInventory.inventoryBulkToggleActivation.userErrors);
    }
    return bulkUpdateInventory;
});
