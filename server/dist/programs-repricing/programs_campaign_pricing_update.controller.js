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
dotenv_1.default.config();
const { ACCESS_TOKEN, STORE, API_VERSION } = process.env;
const ALLOWED_SKU_PREFIXES = ["5D", "10D", "15D", "20D", "40D", "60D"];
const BATCH_SIZE = 25; // max 25 metafields per request
/*-------------------------------------MAIN FUNCTION------------------------------------------------*/
const programs_campaign_pricing_update = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u;
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
        if (!discountGid.includes("DiscountAutomaticNode")) {
            return res.status(200).json({ error: "Discount is not an automatic discount" });
        }
        // 1. Check related products and variants - only proceed if those are programs and includes allowed SKU prefixes ["5D", "10D", "15D", "20D", "60D"]
        // 2. Check if discount is active
        // Proceed with updating variant metafields
        // 3. Check if discount is inactive
        // Proceed with removing variant metafields
        let variants = [];
        const discount = (_b = (_a = (yield client.request(discounts_1.discountQuery, { discountGid }))) === null || _a === void 0 ? void 0 : _a.discountNode) === null || _b === void 0 ? void 0 : _b.discount;
        if (!discount) {
            return res.status(200).json({ error: "Discount not found" });
        }
        const discountStatus = discount === null || discount === void 0 ? void 0 : discount.status;
        const discountedCollections = (_c = discount.customerGets.items.collections) === null || _c === void 0 ? void 0 : _c.edges.map((edge) => edge.node.id);
        const discountedProducts = (_d = discount.customerGets.items.products) === null || _d === void 0 ? void 0 : _d.edges;
        const discountedVariants = (_e = discount.customerGets.items.productVariants) === null || _e === void 0 ? void 0 : _e.edges.map((edge) => edge.node.id);
        if (discountedCollections) {
            for (const collectionId of discountedCollections) {
                const collection = yield client.request(collections_1.collectionQuery, { collectionGid: collectionId });
                const programs = (_h = (_g = (_f = collection === null || collection === void 0 ? void 0 : collection.collection) === null || _f === void 0 ? void 0 : _f.products) === null || _g === void 0 ? void 0 : _g.edges) === null || _h === void 0 ? void 0 : _h.filter((edge) => { var _a, _b; return (_b = (_a = edge.node) === null || _a === void 0 ? void 0 : _a.tags) === null || _b === void 0 ? void 0 : _b.includes("Programy"); });
                if (programs.length > 0) {
                    for (const program of programs) {
                        const programVariants = (_l = (_k = (_j = program === null || program === void 0 ? void 0 : program.node) === null || _j === void 0 ? void 0 : _j.variants) === null || _k === void 0 ? void 0 : _k.edges) === null || _l === void 0 ? void 0 : _l.map((edge) => {
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
                if (((_p = (_o = (_m = variant === null || variant === void 0 ? void 0 : variant.productVariant) === null || _m === void 0 ? void 0 : _m.product) === null || _o === void 0 ? void 0 : _o.tags) === null || _p === void 0 ? void 0 : _p.includes("Programy")) &&
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
                if (((_s = (_r = (_q = variant === null || variant === void 0 ? void 0 : variant.productVariant) === null || _q === void 0 ? void 0 : _q.product) === null || _r === void 0 ? void 0 : _r.tags) === null || _s === void 0 ? void 0 : _s.includes("Programy")) &&
                    ALLOWED_SKU_PREFIXES.some((prefix) => { var _a, _b; return (_b = (_a = variant === null || variant === void 0 ? void 0 : variant.productVariant) === null || _a === void 0 ? void 0 : _a.sku) === null || _b === void 0 ? void 0 : _b.startsWith(prefix); })) {
                    variants.push({
                        id: variant.productVariant.id,
                        sku: variant.productVariant.sku,
                        metafields: variant.productVariant.metafields,
                    });
                }
            }
        }
        if (discountStatus === "ACTIVE") {
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
                    if (((_u = (_t = metafieldsSetResponse === null || metafieldsSetResponse === void 0 ? void 0 : metafieldsSetResponse.metafieldsSet) === null || _t === void 0 ? void 0 : _t.userErrors) === null || _u === void 0 ? void 0 : _u.length) > 0) {
                        console.log("Error setting metafields", metafieldsToSet.slice(i, i + BATCH_SIZE));
                    }
                    else {
                        console.log("Metafields set", metafieldsToSet.slice(i, i + BATCH_SIZE).map((metafield) => metafield.ownerId));
                    }
                }
            }
        }
        else {
            // if evaluated as inactive discount, then remove metafields with matching discount
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
    var _v, _w, _x, _y, _z, _0, _1, _2;
    const metafieldsToDelete = [];
    const programProducts = yield client.request(products_1.productsQueryWithVariants, {
        query: "tags:Programy",
    });
    // return varaints with metafields length > 0
    const variantsWithMetafields = [];
    (_w = (_v = programProducts === null || programProducts === void 0 ? void 0 : programProducts.products) === null || _v === void 0 ? void 0 : _v.edges) === null || _w === void 0 ? void 0 : _w.forEach((edge) => {
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
        if ((_y = (_x = variant.metafields) === null || _x === void 0 ? void 0 : _x.edges) === null || _y === void 0 ? void 0 : _y.find((metafield) => metafield.node.key === "data" && metafield.node.namespace == "campaign")) {
            const campaignData = JSON.parse((_0 = (_z = variant.metafields.edges.find((metafield) => metafield.node.key === "data" && metafield.node.namespace == "campaign")) === null || _z === void 0 ? void 0 : _z.node) === null || _0 === void 0 ? void 0 : _0.value);
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
        if (((_2 = (_1 = deletedMetafields === null || deletedMetafields === void 0 ? void 0 : deletedMetafields.metafieldsDelete) === null || _1 === void 0 ? void 0 : _1.userErrors) === null || _2 === void 0 ? void 0 : _2.length) == 0) {
            console.log(`Deleted metafields as discount is ${discountStatus}`, variantsWithMetafields === null || variantsWithMetafields === void 0 ? void 0 : variantsWithMetafields.map((variant) => variant.sku));
        }
        else {
            console.log(`Error deleting metafields as discount is ${discountStatus}`, variantsWithMetafields === null || variantsWithMetafields === void 0 ? void 0 : variantsWithMetafields.map((variant) => variant.sku));
        }
    }
    return metafieldsToDelete;
});
