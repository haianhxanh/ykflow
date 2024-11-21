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
exports.order_update_attributes = void 0;
const graphql_request_1 = require("graphql-request");
const dotenv_1 = __importDefault(require("dotenv"));
const util_1 = require("util");
const orders_1 = require("../queries/orders");
const sleep = (0, util_1.promisify)(setTimeout);
dotenv_1.default.config();
const { ACCESS_TOKEN, STORE, API_VERSION } = process.env;
const order_update_attributes = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        let orderId = req.query.order_id;
        orderId = "gid://shopify/Order/6317321584987";
        const client = new graphql_request_1.GraphQLClient(`https://${STORE}/admin/api/${API_VERSION}/graphql.json`, {
            // @ts-ignore
            headers: {
                "X-Shopify-Access-Token": ACCESS_TOKEN,
            },
        });
        let orders = yield client.request(orders_1.ordersQuery, {
            query: `id:${orderId.replace("gid://shopify/Order/", "")}`,
        });
        let order = (_a = orders.orders.edges[0]) === null || _a === void 0 ? void 0 : _a.node;
        let programsItems = order.lineItems.edges.filter((line) => {
            return line.node.variant.product.tags.includes("Programy");
        });
        if ((programsItems === null || programsItems === void 0 ? void 0 : programsItems.length) <= 0)
            return res.status(200).json("Order has no programs");
        let hasEndDateAttributes = order.customAttributes.filter((attr) => {
            return attr.key.startsWith("Konec_");
        });
        if ((hasEndDateAttributes === null || hasEndDateAttributes === void 0 ? void 0 : hasEndDateAttributes.length) > 0)
            return res
                .status(200)
                .json("Order has end date attributes, no action needed");
        if ((hasEndDateAttributes === null || hasEndDateAttributes === void 0 ? void 0 : hasEndDateAttributes.length) <= 0) {
            let orderAttributes = order.customAttributes;
            let newAttributes = [];
            for (let program of programsItems) {
                let startDate = order.customAttributes.find((attr) => {
                    return attr.key === `Datum začátku Yes Krabiček`;
                });
                let startDateValue = startDate === null || startDate === void 0 ? void 0 : startDate.value;
                let programLength = parseInt(program.node.variant.title.split("(")[1].split(" dní)")[0]) -
                    1;
                let endDate = calculateNewDate(startDateValue, programLength);
                let endDateAttribute = {
                    key: `Konec_${program.node.variant.id.replace("gid://shopify/ProductVariant/", "")}`,
                    value: endDate,
                };
                orderAttributes.push(endDateAttribute);
            }
            let updateOrder = yield client.request(orders_1.orderUpdateMutation, {
                input: {
                    id: orderId,
                    customAttributes: orderAttributes,
                },
            });
            console.log(updateOrder);
        }
        return res.status(200).json(`Order ${orderId} updated`);
    }
    catch (_b) { }
});
exports.order_update_attributes = order_update_attributes;
function calculateNewDate(startDateStr, daysToAdd) {
    const [day, month, year] = startDateStr.split("-").map(Number);
    const startDate = new Date(year, month - 1, day);
    startDate.setDate(startDate.getDate() + daysToAdd);
    const newDay = String(startDate.getDate()).padStart(2, "0");
    const newMonth = String(startDate.getMonth() + 1).padStart(2, "0");
    const newYear = startDate.getFullYear();
    return `${newDay}-${newMonth}-${newYear}`;
}
