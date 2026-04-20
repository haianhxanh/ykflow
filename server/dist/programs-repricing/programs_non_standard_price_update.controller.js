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
exports.programs_non_standard_price_update = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const graphql_request_1 = require("graphql-request");
const variants_1 = require("../queries/variants");
dotenv_1.default.config();
const { ACCESS_TOKEN, STORE, API_VERSION } = process.env;
const STANDARD_DAYS = [5, 10, 15, 20, 40, 60];
const CALORIE_TYPES = [1500, 1750, 2000, 2250, 2500, 3000];
const NON_STANDARD_DAYS = Array.from({ length: 60 }, (_, i) => i + 1).filter((d) => !STANDARD_DAYS.includes(d));
const getBaseDays = (day) => {
    if (day < 10)
        return 5;
    if (day < 15)
        return 10;
    if (day < 20)
        return 15;
    if (day < 40)
        return 20;
    return 40;
};
/*-------------------------------------MAIN FUNCTION------------------------------------------------*/
const programs_non_standard_price_update = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f;
    try {
        const client = new graphql_request_1.GraphQLClient(`https://${STORE}/admin/api/${API_VERSION}/graphql.json`, {
            headers: {
                "X-Shopify-Access-Token": ACCESS_TOKEN,
            },
        });
        const skipped = [];
        const results = [];
        for (const calories of CALORIE_TYPES) {
            console.log(`\n--- ${calories} kcal ---`);
            // Fetch standard base prices for this calorie type
            const basePrices = {};
            for (const standardDay of STANDARD_DAYS) {
                const sku = `${standardDay}D${calories}`;
                const data = yield client.request(variants_1.variantBySkuQuery, { query: `sku:${sku}` });
                const variant = (_c = (_b = (_a = data === null || data === void 0 ? void 0 : data.productVariants) === null || _a === void 0 ? void 0 : _a.edges) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.node;
                if (variant) {
                    basePrices[standardDay] = parseFloat(variant.price);
                    console.log(`  Base ${sku}: ${variant.price}`);
                }
            }
            // Loop through non-standard days, calculate and update each
            for (const day of NON_STANDARD_DAYS) {
                const sku = `${day}D${calories}`;
                const baseDays = getBaseDays(day);
                const basePrice = basePrices[baseDays];
                if (basePrice === undefined) {
                    console.log(`  ${sku}: no base price for ${baseDays}D — skipping`);
                    skipped.push(sku);
                    continue;
                }
                const data = yield client.request(variants_1.variantBySkuQuery, { query: `sku:${sku}` });
                const variant = (_f = (_e = (_d = data === null || data === void 0 ? void 0 : data.productVariants) === null || _d === void 0 ? void 0 : _d.edges) === null || _e === void 0 ? void 0 : _e[0]) === null || _f === void 0 ? void 0 : _f.node;
                if (!variant)
                    continue; // SKU doesn't exist in the store
                const calculatedPrice = Math.round((basePrice / baseDays) * day).toFixed(2);
                console.log(`  ${sku}: ${baseDays}D base @ ${basePrice} → ${calculatedPrice}`);
                // const update: any = await client.request(productVariantsBulkUpdate, {
                //   productId: variant.product.id,
                //   variants: [{ id: variant.id, price: calculatedPrice }],
                // });
                // const errors = update?.productVariantsBulkUpdate?.userErrors || [];
                // if (errors.length > 0) {
                //   console.log(`  Error updating ${sku}:`, errors);
                //   results.push({ sku, price: calculatedPrice, status: "error", errors });
                // } else {
                //   results.push({ sku, price: calculatedPrice, status: "updated" });
                // }
                // await new Promise((resolve) => setTimeout(resolve, 300));
            }
        }
        return res.status(200).json({ skipped, results });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal server error", errorDetails: error });
    }
});
exports.programs_non_standard_price_update = programs_non_standard_price_update;
