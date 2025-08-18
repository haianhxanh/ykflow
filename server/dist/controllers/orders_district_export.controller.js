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
exports.orders_district_export = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const graphql_request_1 = require("graphql-request");
const orders_1 = require("../queries/orders");
const helpers_1 = require("../utils/helpers");
const axios_1 = __importDefault(require("axios"));
const metafields_1 = require("../queries/metafields");
const commonObjects_1 = require("../queries/commonObjects");
dotenv_1.default.config();
const DELIVERY_METHOD_PICK_UP = "PICK_UP";
const GOOGLE_ADDRESS_COMPONENT_DISTRICT_TYPE = "administrative_area_level_2";
const { ACCESS_TOKEN, STORE, API_VERSION, GOOGLE_GEOCODING_API_KEY } = process.env;
/*-------------------------------------MAIN FUNCTION------------------------------------------------*/
const orders_district_export = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f;
    try {
        const client = new graphql_request_1.GraphQLClient(`https://${STORE}/admin/api/${API_VERSION}/graphql.json`, {
            // @ts-ignore
            headers: {
                "X-Shopify-Access-Token": ACCESS_TOKEN,
            },
        });
        const yesterday = req.query.date ? req.query.date : (0, helpers_1.getYesterday)();
        const latestOrders = yield client.request(orders_1.ordersQuery, {
            query: `(created_at:'${yesterday}')`,
        });
        const disallowedFinancialStatuses = ["VOIDED", "EXPIRED", "REFUNDED"];
        const metafieldsToUpdate = [];
        for (const [orderIndex, order] of latestOrders.orders.edges.entries()) {
            if (disallowedFinancialStatuses.includes((_a = order.node) === null || _a === void 0 ? void 0 : _a.displayFinancialStatus)) {
                continue;
            }
            const firstFulfillmentOrder = (_c = (_b = order.node.fulfillmentOrders) === null || _b === void 0 ? void 0 : _b.edges[0]) === null || _c === void 0 ? void 0 : _c.node;
            if (!firstFulfillmentOrder) {
                continue;
            }
            const deliveryMethod = (_d = firstFulfillmentOrder.deliveryMethod) === null || _d === void 0 ? void 0 : _d.methodType;
            let address = "";
            if (deliveryMethod === DELIVERY_METHOD_PICK_UP) {
                const fulfillmentAddress = (_f = (_e = firstFulfillmentOrder.assignedLocation) === null || _e === void 0 ? void 0 : _e.location) === null || _f === void 0 ? void 0 : _f.address;
                address = assembleAddress(fulfillmentAddress);
            }
            else {
                const shippingAddress = order.node.shippingAddress;
                address = assembleAddress(shippingAddress);
            }
            const addressDistrict = yield getDistrictFromGoogleApi(address);
            if (!addressDistrict) {
                continue;
            }
            metafieldsToUpdate.push({
                ownerId: order.node.id,
                namespace: "custom",
                key: "district",
                type: "single_line_text_field",
                value: addressDistrict,
            });
            const addedTag = yield client.request(commonObjects_1.addTagsMutation, {
                id: order.node.id,
                tags: [`OKRES: ${addressDistrict}`],
            });
            if (addedTag.tagsAdd.userErrors.length > 0) {
                console.log("addedTag errors" + addedTag.tagsAdd.userErrors);
            }
            yield new Promise((resolve) => setTimeout(resolve, 200));
        }
        for (let i = 0; i < metafieldsToUpdate.length; i += 25) {
            const batch = metafieldsToUpdate.slice(i, i + 25);
            const updatedMetafields = yield client.request(metafields_1.metafieldsSetMutation, {
                metafields: batch,
            });
            if (updatedMetafields.metafieldsSet.userErrors.length > 0) {
                console.log("updatedMetafields errors" + updatedMetafields.metafieldsSet.userErrors);
            }
            yield new Promise((resolve) => setTimeout(resolve, 100));
        }
        return res.status(200).json("ok");
    }
    catch (error) {
        console.log(error);
        res.status(500).json({ message: "Error exporting orders" });
    }
});
exports.orders_district_export = orders_district_export;
const assembleAddress = (addressObject) => {
    const addressParts = [addressObject === null || addressObject === void 0 ? void 0 : addressObject.address1, addressObject === null || addressObject === void 0 ? void 0 : addressObject.address2, addressObject === null || addressObject === void 0 ? void 0 : addressObject.city, addressObject === null || addressObject === void 0 ? void 0 : addressObject.zip, addressObject === null || addressObject === void 0 ? void 0 : addressObject.country].filter(Boolean);
    return addressParts.join(", ");
};
const getDistrictFromGoogleApi = (address) => __awaiter(void 0, void 0, void 0, function* () {
    const encodedAddress = encodeURIComponent(address);
    try {
        const addressDistrict = yield axios_1.default
            .get(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${GOOGLE_GEOCODING_API_KEY}`)
            .then((res) => res.data)
            .then((json) => {
            if (json.results.length === 0) {
                return null;
            }
            const district = json.results[0].address_components.find((component) => component.types.includes(GOOGLE_ADDRESS_COMPONENT_DISTRICT_TYPE));
            return district === null || district === void 0 ? void 0 : district.long_name;
        });
        return addressDistrict;
    }
    catch (error) {
        console.log("Error getting district from google api" + error);
        return null;
    }
});
