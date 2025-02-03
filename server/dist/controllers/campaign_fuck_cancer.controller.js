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
exports.campaign_fuck_cancer = void 0;
const graphql_request_1 = require("graphql-request");
const dotenv_1 = __importDefault(require("dotenv"));
const metafields_1 = require("../queries/metafields");
dotenv_1.default.config();
const { ACCESS_TOKEN, STORE, API_VERSION } = process.env;
const campaign_fuck_cancer = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    try {
        const client = new graphql_request_1.GraphQLClient(`https://${STORE}/admin/api/${API_VERSION}/graphql.json`, {
            // @ts-ignore
            headers: {
                "X-Shopify-Access-Token": ACCESS_TOKEN,
            },
        });
        const createdDate = (_b = (_a = req === null || req === void 0 ? void 0 : req.body) === null || _a === void 0 ? void 0 : _a.created_at) === null || _b === void 0 ? void 0 : _b.split("T")[0];
        const createdDateIsInRange = isDateInDateRange(createdDate, "2025-02-04", "2025-02-09");
        if (!createdDateIsInRange) {
            console.log(`${req.body.admin_graphql_api_id} with created_at ${createdDate} date out of range`);
            return res.status(200).json("Date not in range");
        }
        const totalPrice = (_c = req === null || req === void 0 ? void 0 : req.body) === null || _c === void 0 ? void 0 : _c.total_price;
        const donation = totalPrice * 0.1;
        const metafield = yield client.request(metafields_1.shopMetafieldQuery, {
            namespace: "campaign",
            key: "fuck_cancer",
        });
        const shopId = (_d = metafield === null || metafield === void 0 ? void 0 : metafield.shop) === null || _d === void 0 ? void 0 : _d.id;
        const value = ((_f = (_e = metafield === null || metafield === void 0 ? void 0 : metafield.shop) === null || _e === void 0 ? void 0 : _e.metafield) === null || _f === void 0 ? void 0 : _f.value)
            ? parseFloat((_h = (_g = metafield === null || metafield === void 0 ? void 0 : metafield.shop) === null || _g === void 0 ? void 0 : _g.metafield) === null || _h === void 0 ? void 0 : _h.value)
            : 0;
        const newValue = (donation + value).toFixed(2);
        console.log("newValue", newValue);
        const metafieldsUpdate = yield client.request(metafields_1.metafieldsSetMutation, {
            metafields: [
                {
                    key: "fuck_cancer",
                    namespace: "campaign",
                    ownerId: shopId,
                    type: "number_decimal",
                    value: newValue.toString(),
                },
            ],
        });
        return res.status(200).json("ok");
    }
    catch (error) {
        console.error(error);
        return res.status(200).json({ message: "Internal Server Error" });
    }
});
exports.campaign_fuck_cancer = campaign_fuck_cancer;
// check if date is between two dates
function isDateInDateRange(date, startDate, endDate) {
    const inputDate = new Date(date);
    const start = new Date(startDate);
    const end = new Date(endDate);
    return inputDate >= start && inputDate <= end;
}
