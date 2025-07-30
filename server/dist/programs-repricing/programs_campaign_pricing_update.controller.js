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
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r;
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
        let metafieldsToUpdate = [];
        const discount = (_b = (_a = (yield client.request(discounts_1.discountQuery, { discountGid }))) === null || _a === void 0 ? void 0 : _a.discountNode) === null || _b === void 0 ? void 0 : _b.discount;
        if (!discount) {
            return res.status(200).json({ error: "Discount not found" });
        }
        const discountStatus = discount === null || discount === void 0 ? void 0 : discount.status;
        // return res.status(200).json(discount);
        const discountType = ((_d = (_c = discount === null || discount === void 0 ? void 0 : discount.customerGets) === null || _c === void 0 ? void 0 : _c.value) === null || _d === void 0 ? void 0 : _d.percentage) ? "PERCENTAGE" : "FIXED";
        const discountedCollections = (_e = discount.customerGets.items.collections) === null || _e === void 0 ? void 0 : _e.edges.map((edge) => edge.node.id);
        const discountedProducts = (_f = discount.customerGets.items.products) === null || _f === void 0 ? void 0 : _f.edges.map((edge) => edge.node.id);
        const discountedVariants = (_g = discount.customerGets.items.productVariants) === null || _g === void 0 ? void 0 : _g.edges.map((edge) => edge.node.id);
        if (discountedCollections) {
            for (const collectionId of discountedCollections) {
                const collection = yield client.request(collections_1.collectionQuery, { collectionGid: collectionId });
                const programs = (_k = (_j = (_h = collection === null || collection === void 0 ? void 0 : collection.collection) === null || _h === void 0 ? void 0 : _h.products) === null || _j === void 0 ? void 0 : _j.edges) === null || _k === void 0 ? void 0 : _k.filter((edge) => { var _a, _b; return (_b = (_a = edge.node) === null || _a === void 0 ? void 0 : _a.tags) === null || _b === void 0 ? void 0 : _b.includes("Programy"); });
                if (programs.length > 0) {
                    for (const program of programs) {
                        const programVariants = (_o = (_m = (_l = program === null || program === void 0 ? void 0 : program.node) === null || _l === void 0 ? void 0 : _l.variants) === null || _m === void 0 ? void 0 : _m.edges) === null || _o === void 0 ? void 0 : _o.map((edge) => {
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
            // for (const productId of discountedProducts) {
            //   const product = await client.request(productQuery, { productGid: productId });
            //   const variants = product?.product?.variants?.edges?.map((edge: any) => edge.node.id);
            //   variants = variants.concat(productVariants.filter((variant: any) => variant !== undefined));
            // }
        }
        if (discountedVariants) {
            for (const variantId of discountedVariants) {
                const variant = yield client.request(variants_1.variantByIdQuery, { variantGid: variantId });
                if (((_r = (_q = (_p = variant === null || variant === void 0 ? void 0 : variant.productVariant) === null || _p === void 0 ? void 0 : _p.product) === null || _q === void 0 ? void 0 : _q.tags) === null || _r === void 0 ? void 0 : _r.includes("Programy")) &&
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
            // const variantsWithMetafields = variants.filter((variant: any) => variant?.metafields?.edges?.length > 0);
            // const metafieldsToDelete = variantsWithMetafields.flatMap((variant: any) =>
            //   variant.metafields?.edges?.map((metafield: any) => ({
            //     ownerId: variant.id,
            //     namespace: "campaign",
            //     key: metafield.node.key,
            //   }))
            // );
            // if (metafieldsToDelete.length > 0) {
            //   const deletedMetafields = await client.request(metafieldsDeleteMutation, {
            //     metafields: metafieldsToDelete,
            //   });
            // }
            // const metafieldsToSet = [];
            // for (const variant of variants) {
            //   const metafield = createMetafieldsData(variant.id, variant.price, discountGid);
            // }
            const metafieldsToSet = [];
            for (const variant of variants) {
                // get metafield campaign.data and update it
                // const existingCampaignDataMeta = variant.metafields.edges.find((metafield: any) => metafield.node.key === "data");
                // const isSameDiscount = existingCampaignDataMeta ? JSON.parse(existingCampaignDataMeta?.node?.value)?.id == discountGid : false;
                // if (existingCampaignDataMeta && !isSameDiscount) {
                //   // if existing but not the same, then evaluate the discount and update the meta
                //   console.log("this is running");
                //   return res.status(200).json(existingCampaignDataMeta);
                //   // TODO: check existing data and update it with new metaobject or remove current object and update current data
                // } else {
                //   // if not existing, or existing but the same, then just update the metafield right away
                //   metafieldsToSet.push({
                //     ownerId: variant.id,
                //     namespace: "campaign",
                //     key: "data",
                //     value: JSON.stringify(createDiscountObject(discount, discountGid)),
                //   });
                // }
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
                    console.log(metafieldsSetResponse);
                }
                return res.status(200).json(metafieldsToSet);
            }
        }
        else {
            // remove metafields from variants
            console.log("DISABLED");
        }
        return res.status(200).json(variants);
        const products = yield client.request(products_1.productsQuery, { collectionGids: discountedCollections });
        return res.status(200).json(discountedCollections);
        return res.status(200).json(discount);
    }
    catch (error) {
        console.log(error);
    }
});
exports.programs_campaign_pricing_update = programs_campaign_pricing_update;
const priceCalculation = (price, discountType, discountValue) => {
    if (discountType === "PERCENTAGE") {
        return price * (1 - discountValue / 100);
    }
    return price - discountValue;
};
const createMetafieldsData = (variantId, price, discountData) => {
    const metafields = [];
    metafields.push({
        ownerId: variantId,
        namespace: "campaign",
        key: "id",
        value: discountData.id,
    });
    if (discountData.startsAt) {
        metafields.push({
            ownerId: variantId,
            namespace: "campaign",
            key: "starts_at",
            value: discountData.startsAt,
        });
    }
    if (discountData.endsAt) {
        metafields.push({
            ownerId: variantId,
            namespace: "campaign",
            key: "ends_at",
            value: discountData.endsAt,
        });
    }
    if (discountData.customerGets.value.percentage) {
        metafields.push({
            ownerId: variantId,
            namespace: "campaign",
            key: "discount_percentage",
            value: discountData.customerGets.value.percentage.toString(),
        });
    }
    return metafields;
    // TODO: add for amount
};
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
