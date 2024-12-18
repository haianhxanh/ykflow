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
exports.pickup_locations_capacity_update = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const graphql_request_1 = require("graphql-request");
const orders_1 = require("../queries/orders");
dotenv_1.default.config();
const { ACCESS_TOKEN, STORE, API_VERSION } = process.env;
const pickup_locations_capacity_update = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const client = new graphql_request_1.GraphQLClient(`https://${STORE}/admin/api/${API_VERSION}/graphql.json`, {
            // @ts-ignore
            headers: {
                "X-Shopify-Access-Token": ACCESS_TOKEN,
            },
        });
        let orders = yield client.request(orders_1.ordersQuery, {
            query: `delivery_method:pick-up AND financial_status:paid AND created_at:>=2024-06-30`,
        });
        let ordersWithPrograms = orders.map((order) => {
            let startDate = order.node.customAttributes.find((attr) => {
                return attr.key == "Datum začátku Yes Krabiček";
            });
            let endDate = order.node.customAttributes.find((attr) => {
                return attr.key.includes("Konec_");
            });
            if (!startDate) {
                return;
            }
            startDate = formatDate(startDate.value);
            endDate = formatDate(endDate.value);
            return {
                orderId: order.node.id,
                startDate: startDate,
                endDate: endDate,
            };
        });
        for (const [index, order] of ordersWithPrograms.entries()) {
        }
    }
    catch (error) { }
});
exports.pickup_locations_capacity_update = pickup_locations_capacity_update;
function formatDate(date) {
    const [day, month, year] = date.split("-");
    return `${year}-${month}-${day}`;
}
