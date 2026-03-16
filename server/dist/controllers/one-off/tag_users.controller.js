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
exports.tag_users = void 0;
// tag users based on orders from Excel file
const graphql_request_1 = require("graphql-request");
const exceljs_1 = __importDefault(require("exceljs"));
const orders_1 = require("../../queries/orders");
const commonObjects_1 = require("../../queries/commonObjects");
const { ACCESS_TOKEN, STORE, API_VERSION } = process.env;
const tag_users = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const excelFilePath = req.query.excelFilePath;
        const workbook = new exceljs_1.default.Workbook();
        yield workbook.xlsx.readFile(excelFilePath);
        const worksheet = workbook.getWorksheet(1);
        const rows = worksheet === null || worksheet === void 0 ? void 0 : worksheet.getRows(1, worksheet === null || worksheet === void 0 ? void 0 : worksheet.rowCount);
        const orders = rows === null || rows === void 0 ? void 0 : rows.map((row) => row.getCell(1).value);
        // filter out first item and ANY items with VIP as value
        const filteredOrders = orders === null || orders === void 0 ? void 0 : orders.filter((order) => order !== (orders === null || orders === void 0 ? void 0 : orders[0]) && !(order === null || order === void 0 ? void 0 : order.includes("VIP")));
        console.log(filteredOrders === null || filteredOrders === void 0 ? void 0 : filteredOrders.length);
        const client = new graphql_request_1.GraphQLClient(`https://${STORE}/admin/api/${API_VERSION}/graphql.json`, {
            // @ts-ignore
            headers: {
                "X-Shopify-Access-Token": ACCESS_TOKEN,
            },
        });
        for (const [index, orderName] of (filteredOrders === null || filteredOrders === void 0 ? void 0 : filteredOrders.entries()) || []) {
            const order = yield client.request(orders_1.ordersQuery, { query: `name:${orderName}` });
            const customerId = order.orders.edges[0].node.customer.id;
            const tagsAdded = yield client.request(commonObjects_1.addTagsMutation, { id: customerId, tags: ["MISSING_RATING_WEEK_09_2026"] });
            console.log(`${index + 1} of ${filteredOrders === null || filteredOrders === void 0 ? void 0 : filteredOrders.length} - ${orderName} - ${customerId} - ${((_a = tagsAdded.tagsAdd.userErrors) === null || _a === void 0 ? void 0 : _a.length) > 0 ? tagsAdded.tagsAdd.userErrors[0].message : "OK"}`);
        }
        const columns = [{ header: "Email", key: "email", width: 20 }];
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ error: "Internal server error" });
    }
});
exports.tag_users = tag_users;
