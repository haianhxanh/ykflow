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
exports.programs_campaign_pricing_update = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const graphql_request_1 = require("graphql-request");
const discounts_1 = require("../queries/discounts");
const products_1 = require("../queries/products");
const collections_1 = require("../queries/collections");
const metafields_1 = require("../queries/metafields");
const variants_1 = require("../queries/variants");
const automaticDiscounts_model_1 = __importDefault(require("../model/automaticDiscounts.model"));
dotenv_1.default.config();
const { ACCESS_TOKEN, STORE, API_VERSION } = process.env;
const ALLOWED_SKU_PREFIXES = ["5D", "10D", "15D", "20D", "40D", "60D"];
const BATCH_SIZE = 25; // max 25 metafields per request
/*-------------------------------------MAIN FUNCTION------------------------------------------------*/
const programs_campaign_pricing_update = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0;
    const startTime = Date.now();
    console.log(`Starting request at ${new Date().toISOString()}`);
    try {
        console.log(req.body);
        // return res.status(200).json(req.body);
        const client = new graphql_request_1.GraphQLClient(`https://${STORE}/admin/api/${API_VERSION}/graphql.json`, {
            headers: {
                "X-Shopify-Access-Token": ACCESS_TOKEN,
            },
        });
        const discountGid = req.body.admin_graphql_api_id;
        const activeStatus = ((_a = req.body) === null || _a === void 0 ? void 0 : _a.status) == "ACTIVE" || ((_b = req.body) === null || _b === void 0 ? void 0 : _b.status) == "SCHEDULED";
        if (!activeStatus) {
            // check in DB if discount is related to program discount
            const discountId = yield automaticDiscounts_model_1.default.findOne({ where: { gid: discountGid.split("/").pop() } });
            if (discountId) {
                const status = ((_c = req.body) === null || _c === void 0 ? void 0 : _c.status) || "DELETED";
                yield deleteMetafieldsWithMatchingDiscount(discountGid, client, status);
                return res.status(200).json({ message: "Discount data removed from associated variant metafields" });
            }
            return res.status(200).json({ message: "Discount not related to program discount" });
        }
        if (!discountGid.includes("DiscountAutomaticNode")) {
            return res.status(200).json({ error: "Discount is not an automatic discount" });
        }
        // 1. Check related products and variants - only proceed if those are programs and includes allowed SKU prefixes ["5D", "10D", "15D", "20D", "60D"]
        // 2. Check if discount is active
        // Proceed with updating variant metafields
        let variants = [];
        const discount = (_e = (_d = (yield client.request(discounts_1.discountQuery, { discountGid }))) === null || _d === void 0 ? void 0 : _d.discountNode) === null || _e === void 0 ? void 0 : _e.discount;
        if (!discount) {
            return res.status(200).json({ error: "Discount not found" });
        }
        const discountStatus = discount === null || discount === void 0 ? void 0 : discount.status;
        const discountedCollections = (_g = (_f = discount.customerGets.items) === null || _f === void 0 ? void 0 : _f.collections) === null || _g === void 0 ? void 0 : _g.edges.map((edge) => edge.node.id);
        const discountedProducts = (_j = (_h = discount.customerGets.items) === null || _h === void 0 ? void 0 : _h.products) === null || _j === void 0 ? void 0 : _j.edges;
        const discountedVariants = (_l = (_k = discount.customerGets.items) === null || _k === void 0 ? void 0 : _k.productVariants) === null || _l === void 0 ? void 0 : _l.edges.map((edge) => edge.node.id);
        if (discountedCollections) {
            for (const collectionId of discountedCollections) {
                const collection = yield client.request(collections_1.collectionQuery, { collectionGid: collectionId });
                const programs = (_p = (_o = (_m = collection === null || collection === void 0 ? void 0 : collection.collection) === null || _m === void 0 ? void 0 : _m.products) === null || _o === void 0 ? void 0 : _o.edges) === null || _p === void 0 ? void 0 : _p.filter((edge) => { var _a, _b; return (_b = (_a = edge.node) === null || _a === void 0 ? void 0 : _a.tags) === null || _b === void 0 ? void 0 : _b.includes("Programy"); });
                if (programs.length > 0) {
                    for (const program of programs) {
                        const programVariants = (_s = (_r = (_q = program === null || program === void 0 ? void 0 : program.node) === null || _q === void 0 ? void 0 : _q.variants) === null || _r === void 0 ? void 0 : _r.edges) === null || _s === void 0 ? void 0 : _s.map((edge) => {
                            if (ALLOWED_SKU_PREFIXES.some((prefix) => { var _a, _b; return (_b = (_a = edge === null || edge === void 0 ? void 0 : edge.node) === null || _a === void 0 ? void 0 : _a.sku) === null || _b === void 0 ? void 0 : _b.startsWith(prefix); })) {
                                return {
                                    id: edge.node.id,
                                    sku: edge.node.sku,
                                    metafields: edge.node.metafields,
                                };
                            }
                        });
                        variants = variants.concat(programVariants.filter((variant) => variant !== undefined));
                    }
                }
            }
        }
        if (discountedProducts) {
            // return res.status(200).json(discountedProducts);
            const discountedProductsVariants = discountedProducts
                .map((product) => {
                var _a, _b, _c;
                return (_c = (_b = (_a = product === null || product === void 0 ? void 0 : product.node) === null || _a === void 0 ? void 0 : _a.variants) === null || _b === void 0 ? void 0 : _b.edges) === null || _c === void 0 ? void 0 : _c.map((edge) => {
                    if (ALLOWED_SKU_PREFIXES.some((prefix) => { var _a, _b; return (_b = (_a = edge === null || edge === void 0 ? void 0 : edge.node) === null || _a === void 0 ? void 0 : _a.sku) === null || _b === void 0 ? void 0 : _b.startsWith(prefix); })) {
                        return edge.node.id;
                    }
                });
            })
                .flat()
                .filter((variant) => variant !== undefined);
            // return res.status(200).json(discountedProductsVariants);
            for (const variantId of discountedProductsVariants) {
                const variant = yield client.request(variants_1.variantByIdQuery, { variantGid: variantId });
                if (((_v = (_u = (_t = variant === null || variant === void 0 ? void 0 : variant.productVariant) === null || _t === void 0 ? void 0 : _t.product) === null || _u === void 0 ? void 0 : _u.tags) === null || _v === void 0 ? void 0 : _v.includes("Programy")) &&
                    ALLOWED_SKU_PREFIXES.some((prefix) => { var _a, _b; return (_b = (_a = variant === null || variant === void 0 ? void 0 : variant.productVariant) === null || _a === void 0 ? void 0 : _a.sku) === null || _b === void 0 ? void 0 : _b.startsWith(prefix); })) {
                    variants.push({
                        id: variant.productVariant.id,
                        sku: variant.productVariant.sku,
                        metafields: variant.productVariant.metafields,
                    });
                }
            }
        }
        if (discountedVariants) {
            for (const variantId of discountedVariants) {
                const variant = yield client.request(variants_1.variantByIdQuery, { variantGid: variantId });
                if (((_y = (_x = (_w = variant === null || variant === void 0 ? void 0 : variant.productVariant) === null || _w === void 0 ? void 0 : _w.product) === null || _x === void 0 ? void 0 : _x.tags) === null || _y === void 0 ? void 0 : _y.includes("Programy")) &&
                    ALLOWED_SKU_PREFIXES.some((prefix) => { var _a, _b; return (_b = (_a = variant === null || variant === void 0 ? void 0 : variant.productVariant) === null || _a === void 0 ? void 0 : _a.sku) === null || _b === void 0 ? void 0 : _b.startsWith(prefix); })) {
                    variants.push({
                        id: variant.productVariant.id,
                        sku: variant.productVariant.sku,
                        metafields: variant.productVariant.metafields,
                    });
                }
            }
        }
        if (discountStatus === "ACTIVE" || discountStatus === "SCHEDULED") {
            // if evaluated as active discount, first remove metafields
            yield deleteMetafieldsWithMatchingDiscount(discountGid, client, discountStatus);
            yield new Promise((resolve) => setTimeout(resolve, 500));
            const metafieldsToSet = [];
            for (const variant of variants) {
                metafieldsToSet.push({
                    ownerId: variant.id,
                    namespace: "campaign",
                    key: "data",
                    value: JSON.stringify(createDiscountObject(discount, discountGid)),
                });
            }
            if (metafieldsToSet.length > 0) {
                for (let i = 0; i < metafieldsToSet.length; i += BATCH_SIZE) {
                    const metafieldsSetResponse = yield client.request(metafields_1.metafieldsSetMutation, {
                        metafields: metafieldsToSet.slice(i, i + BATCH_SIZE),
                    });
                    if (((_0 = (_z = metafieldsSetResponse === null || metafieldsSetResponse === void 0 ? void 0 : metafieldsSetResponse.metafieldsSet) === null || _z === void 0 ? void 0 : _z.userErrors) === null || _0 === void 0 ? void 0 : _0.length) > 0) {
                        console.log("Error setting metafields", metafieldsToSet.slice(i, i + BATCH_SIZE));
                    }
                    else {
                        console.log("Metafields set", metafieldsToSet.slice(i, i + BATCH_SIZE).map((metafield) => metafield.ownerId));
                    }
                }
            }
            yield automaticDiscounts_model_1.default.create({
                gid: discountGid.split("/").pop(),
            });
        }
        else {
            yield deleteMetafieldsWithMatchingDiscount(discountGid, client, discountStatus);
        }
        console.log(`Request completed successfully in ${Date.now() - startTime}ms`);
        return res.status(200).json({
            message: "Discount updated successfully",
        });
    }
    catch (error) {
        console.log(`Request failed after ${Date.now() - startTime}ms:`, error);
        return res.status(500).json({ error: "Internal server error", errorDetails: error });
    }
});
exports.programs_campaign_pricing_update = programs_campaign_pricing_update;
const createDiscountObject = (discountData, discountId) => {
    var _a, _b, _c, _d, _e, _f, _g;
    return {
        id: discountId,
        status: discountData.status,
        starts_at: discountData.startsAt,
        ends_at: discountData.endsAt,
        discount_percentage: ((_b = (_a = discountData.customerGets) === null || _a === void 0 ? void 0 : _a.value) === null || _b === void 0 ? void 0 : _b.percentage) || null,
        discount_amount: ((_e = (_d = (_c = discountData.customerGets) === null || _c === void 0 ? void 0 : _c.value) === null || _d === void 0 ? void 0 : _d.amount) === null || _e === void 0 ? void 0 : _e.amount) || null,
        discount_type: ((_g = (_f = discountData.customerGets) === null || _f === void 0 ? void 0 : _f.value) === null || _g === void 0 ? void 0 : _g.percentage) ? "PERCENTAGE" : "FIXED",
    };
};
const deleteMetafieldsWithMatchingDiscount = (discountGid, client, discountStatus) => __awaiter(void 0, void 0, void 0, function* () {
    var _1, _2, _3, _4, _5, _6, _7, _8;
    const metafieldsToDelete = [];
    const programProducts = yield client.request(products_1.productsQueryWithVariants, {
        query: "tags:Programy",
    });
    // return varaints with metafields length > 0
    const variantsWithMetafields = [];
    (_2 = (_1 = programProducts === null || programProducts === void 0 ? void 0 : programProducts.products) === null || _1 === void 0 ? void 0 : _1.edges) === null || _2 === void 0 ? void 0 : _2.forEach((edge) => {
        var _a, _b, _c;
        (_c = (_b = (_a = edge.node) === null || _a === void 0 ? void 0 : _a.variants) === null || _b === void 0 ? void 0 : _b.edges) === null || _c === void 0 ? void 0 : _c.forEach((variant) => {
            var _a, _b, _c;
            if (((_c = (_b = (_a = variant === null || variant === void 0 ? void 0 : variant.node) === null || _a === void 0 ? void 0 : _a.metafields) === null || _b === void 0 ? void 0 : _b.edges) === null || _c === void 0 ? void 0 : _c.length) > 0) {
                variantsWithMetafields.push({
                    id: variant.node.id,
                    sku: variant.node.sku,
                    metafields: variant.node.metafields,
                });
            }
        });
    });
    for (const variant of variantsWithMetafields) {
        if ((_4 = (_3 = variant.metafields) === null || _3 === void 0 ? void 0 : _3.edges) === null || _4 === void 0 ? void 0 : _4.find((metafield) => metafield.node.key === "data" && metafield.node.namespace == "campaign")) {
            const campaignData = JSON.parse((_6 = (_5 = variant.metafields.edges.find((metafield) => metafield.node.key === "data" && metafield.node.namespace == "campaign")) === null || _5 === void 0 ? void 0 : _5.node) === null || _6 === void 0 ? void 0 : _6.value);
            const matchingCampaign = (campaignData === null || campaignData === void 0 ? void 0 : campaignData.id) == discountGid;
            if (matchingCampaign) {
                metafieldsToDelete.push({
                    ownerId: variant.id,
                    namespace: "campaign",
                    key: "data",
                });
            }
        }
    }
    if (metafieldsToDelete.length > 0) {
        const deletedMetafields = yield client.request(metafields_1.metafieldsDeleteMutation, {
            metafields: metafieldsToDelete,
        });
        if (((_8 = (_7 = deletedMetafields === null || deletedMetafields === void 0 ? void 0 : deletedMetafields.metafieldsDelete) === null || _7 === void 0 ? void 0 : _7.userErrors) === null || _8 === void 0 ? void 0 : _8.length) == 0) {
            console.log(`Deleted metafields as discount is ${discountStatus}`, variantsWithMetafields === null || variantsWithMetafields === void 0 ? void 0 : variantsWithMetafields.map((variant) => variant.sku));
        }
        else {
            console.log(`Error deleting metafields as discount is ${discountStatus}`, variantsWithMetafields === null || variantsWithMetafields === void 0 ? void 0 : variantsWithMetafields.map((variant) => variant.sku));
        }
    }
    return metafieldsToDelete;
});
