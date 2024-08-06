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
exports.fulfill = void 0;
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = __importDefault(require("dotenv"));
const util_1 = require("util");
const sleep = (0, util_1.promisify)(setTimeout);
dotenv_1.default.config();
const { ACCESS_TOKEN, STORE, API_VERSION } = process.env;
const fulfill = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        let order_id = req.query.order_id;
        if (!order_id) {
            return res.status(400).send("Order ID is required");
        }
        order_id = order_id.replace("gid://shopify/Order/", "");
        let fulfilled_order = yield fulfill_order(order_id);
        res.status(200).send(`Order ${req.query.order_id} has been fulfilled`);
    }
    catch (_a) {
        res.status(400).send(`Order ${req.query.order_id} could not be fulfilled`);
    }
});
exports.fulfill = fulfill;
const fulfill_order = (order_id) => __awaiter(void 0, void 0, void 0, function* () {
    var _b;
    const { data } = yield axios_1.default.get(`https://${STORE}/admin/api/${API_VERSION}/orders/${order_id}/fulfillment_orders.json`, {
        headers: {
            "X-Shopify-Access-Token": ACCESS_TOKEN,
        },
    });
    const create_fulfillment = {
        fulfillment: {
            line_items_by_fulfillment_order: [
                {
                    fulfillment_order_id: (_b = data.fulfillment_orders[0]) === null || _b === void 0 ? void 0 : _b.id,
                },
            ],
            notify_customer: false,
        },
    };
    const create_fulfillment_res = yield axios_1.default.post(`https://${STORE}/admin/api/${API_VERSION}/fulfillments.json`, create_fulfillment, {
        headers: {
            "X-Shopify-Access-Token": ACCESS_TOKEN,
            "Content-Type": "application/json",
        },
    });
    return create_fulfillment_res;
});
