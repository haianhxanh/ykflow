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
exports.programs_new_price_update = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const graphql_request_1 = require("graphql-request");
const exceljs_1 = __importDefault(require("exceljs"));
const metafields_1 = require("../queries/metafields");
const variants_1 = require("../queries/variants");
dotenv_1.default.config();
const { ACCESS_TOKEN, STORE, API_VERSION } = process.env;
/*-------------------------------------MAIN FUNCTION------------------------------------------------*/
const programs_new_price_update = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    try {
        const excelFilePath = req.query.excelFilePath;
        if (!excelFilePath) {
            return res.status(400).json({ error: "excelFilePath query parameter is required" });
        }
        const client = new graphql_request_1.GraphQLClient(`https://${STORE}/admin/api/${API_VERSION}/graphql.json`, {
            headers: {
                "X-Shopify-Access-Token": ACCESS_TOKEN,
            },
        });
        const workbook = new exceljs_1.default.Workbook();
        yield workbook.xlsx.readFile(excelFilePath);
        const worksheet = workbook.getWorksheet(1);
        if (!worksheet) {
            return res.status(400).json({ error: "Worksheet not found in Excel file" });
        }
        const results = [];
        const rows = worksheet.getRows(1, worksheet.rowCount) || [];
        for (const row of rows) {
            const sku = (_a = row.getCell(1).value) === null || _a === void 0 ? void 0 : _a.toString().trim();
            const price = (_b = row.getCell(2).value) === null || _b === void 0 ? void 0 : _b.toString().trim();
            const progressivePrice = (_c = row.getCell(3).value) === null || _c === void 0 ? void 0 : _c.toString().trim();
            if (!sku || !price) {
                console.log(`Skipping row ${row.number}: missing SKU or price`);
                continue;
            }
            const variantData = yield client.request(variants_1.variantBySkuQuery, { query: `sku:${sku}` });
            const variant = (_f = (_e = (_d = variantData === null || variantData === void 0 ? void 0 : variantData.productVariants) === null || _d === void 0 ? void 0 : _d.edges) === null || _e === void 0 ? void 0 : _e[0]) === null || _f === void 0 ? void 0 : _f.node;
            if (!variant) {
                console.log(`Variant not found for SKU: ${sku}`);
                results.push({ sku, status: "not_found" });
                continue;
            }
            // Update price
            const priceUpdate = yield client.request(variants_1.productVariantsBulkUpdate, {
                productId: variant.product.id,
                variants: [{ id: variant.id, price }],
            });
            const priceErrors = (_g = priceUpdate === null || priceUpdate === void 0 ? void 0 : priceUpdate.productVariantsBulkUpdate) === null || _g === void 0 ? void 0 : _g.userErrors;
            if ((priceErrors === null || priceErrors === void 0 ? void 0 : priceErrors.length) > 0) {
                console.log(`Error updating price for SKU ${sku}:`, priceErrors);
                results.push({ sku, status: "price_update_error", errors: priceErrors });
                continue;
            }
            // Update custom.progressive_price metafield
            if (progressivePrice) {
                const metafieldUpdate = yield client.request(metafields_1.metafieldsSetMutation, {
                    metafields: [
                        {
                            ownerId: variant.id,
                            namespace: "custom",
                            key: "progressive_price",
                            value: progressivePrice,
                            type: "number_decimal",
                        },
                    ],
                });
                const metafieldErrors = (_h = metafieldUpdate === null || metafieldUpdate === void 0 ? void 0 : metafieldUpdate.metafieldsSet) === null || _h === void 0 ? void 0 : _h.userErrors;
                if ((metafieldErrors === null || metafieldErrors === void 0 ? void 0 : metafieldErrors.length) > 0) {
                    console.log(`Error updating metafield for SKU ${sku}:`, metafieldErrors);
                    results.push({ sku, status: "metafield_update_error", errors: metafieldErrors });
                    continue;
                }
            }
            console.log(`Updated SKU ${sku}: price=${price}, progressive_price=${progressivePrice}`);
            results.push({ sku, status: "updated" });
            yield new Promise((resolve) => setTimeout(resolve, 300));
        }
        return res.status(200).json({ results });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal server error", errorDetails: error });
    }
});
exports.programs_new_price_update = programs_new_price_update;
