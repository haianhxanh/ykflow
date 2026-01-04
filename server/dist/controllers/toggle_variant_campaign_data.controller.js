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
exports.toggle_variant_campaign_data = void 0;
const graphql_request_1 = require("graphql-request");
const products_1 = require("../queries/products");
const dotenv_1 = __importDefault(require("dotenv"));
const metafields_1 = require("../queries/metafields");
dotenv_1.default.config();
const { STORE, API_VERSION, ACCESS_TOKEN } = process.env;
const ALLOWED_SKU_PREFIXES = ["5D", "10D", "15D", "20D", "40D", "60D"];
const MAX_BATCH_SIZE = 25;
const toggle_variant_campaign_data = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    try {
        const { toggle } = req.query;
        if (!toggle) {
            return res.status(400).json({ message: "toggle parameter with value on/off is required" });
        }
        const client = new graphql_request_1.GraphQLClient(`https://${STORE}/admin/api/${API_VERSION}/graphql.json`, {
            // @ts-ignore
            headers: {
                "X-Shopify-Access-Token": ACCESS_TOKEN,
            },
        });
        const programs = yield client.request(products_1.programsQueryWithVariants);
        const variants = (_b = (_a = programs === null || programs === void 0 ? void 0 : programs.products) === null || _a === void 0 ? void 0 : _a.edges) === null || _b === void 0 ? void 0 : _b.flatMap((edge) => { var _a, _b, _c; return (_c = (_b = (_a = edge === null || edge === void 0 ? void 0 : edge.node) === null || _a === void 0 ? void 0 : _a.variants) === null || _b === void 0 ? void 0 : _b.edges) === null || _c === void 0 ? void 0 : _c.filter((variant) => ALLOWED_SKU_PREFIXES.some((prefix) => { var _a, _b; return (_b = (_a = variant === null || variant === void 0 ? void 0 : variant.node) === null || _a === void 0 ? void 0 : _a.sku) === null || _b === void 0 ? void 0 : _b.startsWith(prefix); })); });
        try {
            if (toggle === "on") {
                const metafieldsToSet = [];
                for (const variant of variants) {
                    metafieldsToSet.push({
                        namespace: "campaign",
                        key: "data",
                        value: JSON.stringify(DUMMY_CAMPAIGN_DATA),
                        ownerId: variant.node.id,
                    });
                }
                if (metafieldsToSet.length > 0) {
                    for (let i = 0; i < metafieldsToSet.length; i += MAX_BATCH_SIZE) {
                        const metafieldsSetResponse = yield client.request(metafields_1.metafieldsSetMutation, {
                            metafields: metafieldsToSet.slice(i, i + MAX_BATCH_SIZE),
                        });
                        if (((_d = (_c = metafieldsSetResponse === null || metafieldsSetResponse === void 0 ? void 0 : metafieldsSetResponse.metafieldsSet) === null || _c === void 0 ? void 0 : _c.userErrors) === null || _d === void 0 ? void 0 : _d.length) > 0) {
                            console.log("Error setting metafields", (_e = metafieldsSetResponse === null || metafieldsSetResponse === void 0 ? void 0 : metafieldsSetResponse.metafieldsSet) === null || _e === void 0 ? void 0 : _e.userErrors);
                        }
                        else {
                            console.log("Metafields set");
                        }
                    }
                }
            }
            if (toggle === "off") {
                const metafieldsToDelete = [];
                for (const variant of variants) {
                    metafieldsToDelete.push({
                        namespace: "campaign",
                        key: "data",
                        ownerId: variant.node.id,
                    });
                }
                if (metafieldsToDelete.length > 0) {
                    for (let i = 0; i < metafieldsToDelete.length; i += MAX_BATCH_SIZE) {
                        const metafieldsDeleteResponse = yield client.request(metafields_1.metafieldsDeleteMutation, {
                            metafields: metafieldsToDelete.slice(i, i + MAX_BATCH_SIZE),
                        });
                        if (((_g = (_f = metafieldsDeleteResponse === null || metafieldsDeleteResponse === void 0 ? void 0 : metafieldsDeleteResponse.metafieldsDelete) === null || _f === void 0 ? void 0 : _f.userErrors) === null || _g === void 0 ? void 0 : _g.length) > 0) {
                            console.log("Error deleting metafields", (_h = metafieldsDeleteResponse === null || metafieldsDeleteResponse === void 0 ? void 0 : metafieldsDeleteResponse.metafieldsDelete) === null || _h === void 0 ? void 0 : _h.userErrors);
                        }
                        else {
                            console.log("Metafields deleted");
                        }
                    }
                }
            }
        }
        catch (error) {
            console.error(error);
            return res.status(500).json({ message: "Internal Server Error" });
        }
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
    return res.status(200).json({ message: "Campaign data toggled" });
});
exports.toggle_variant_campaign_data = toggle_variant_campaign_data;
const DUMMY_CAMPAIGN_DATA = {
    id: "gid://shopify/DiscountAutomaticNode/1541154570538",
    status: "ACTIVE",
    starts_at: "2025-08-21T21:17:23Z",
    ends_at: null,
    discount_percentage: 0,
    discount_amount: null,
    discount_type: "PERCENTAGE",
};
