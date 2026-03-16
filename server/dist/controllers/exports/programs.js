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
exports.programs = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const graphql_request_1 = require("graphql-request");
const orders_1 = require("../../queries/orders");
const exceljs_1 = __importDefault(require("exceljs"));
dotenv_1.default.config();
const { ACCESS_TOKEN, STORE, API_VERSION } = process.env;
/*-------------------------------------MAIN FUNCTION------------------------------------------------*/
const programs = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const client = new graphql_request_1.GraphQLClient(`https://${STORE}/admin/api/${API_VERSION}/graphql.json`, {
            // @ts-ignore
            headers: {
                "X-Shopify-Access-Token": ACCESS_TOKEN,
            },
        });
        const workbook = new exceljs_1.default.Workbook();
        const worksheet = workbook.addWorksheet("Sheet1");
        const allOrders = yield (0, orders_1.allOrdersQuery)("created_at:>=2025-10-31 AND created_at:<=2026-01-31");
        // const firstOrder = allOrders[0].node;
        for (const [index, order] of allOrders.entries()) {
            const orderHasProgram = order.node.lineItems.edges.some((item) => { var _a, _b; return (_b = (_a = item.node.variant.product) === null || _a === void 0 ? void 0 : _a.tags) === null || _b === void 0 ? void 0 : _b.includes("Programy"); });
            if (!orderHasProgram)
                continue;
            const programItems = order.node.lineItems.edges.filter((item) => { var _a, _b; return (_b = (_a = item.node.variant.product) === null || _a === void 0 ? void 0 : _a.tags) === null || _b === void 0 ? void 0 : _b.includes("Programy"); });
            // return res.status(200).json({ programItems });
            let isFirstRowOfOrder = true;
            for (const programItem of programItems) {
                const orderName = order.node.name;
                const orderCreatedAt = order.node.createdAt.split("T")[0];
                const programStartDate = (_a = order.node.customAttributes.find((attr) => attr.key == "Datum začátku Yes Krabiček")) === null || _a === void 0 ? void 0 : _a.value;
                const programStartDateParts = programStartDate === null || programStartDate === void 0 ? void 0 : programStartDate.split("-");
                const programStartDateFormatted = programStartDateParts
                    ? `${programStartDateParts[2]}-${programStartDateParts[1]}-${programStartDateParts[0]}`
                    : programStartDate;
                const programLength = programItem.node.variant.sku.split("D")[0];
                const programType = programItem.node.variant.sku.split("D")[1];
                const orderTotal = order.node.originalTotalPriceSet.shopMoney.amount;
                const discount = order.node.totalDiscountsSet.shopMoney.amount;
                const shipping = order.node.totalShippingPriceSet.shopMoney.amount;
                const quantity = programItem.node.quantity;
                const note = order.node.note;
                for (let q = 0; q < quantity; q++) {
                    if (isFirstRowOfOrder) {
                        worksheet.addRow([orderName, orderCreatedAt, orderTotal, discount, shipping, programType, programStartDateFormatted, programLength, note]);
                        isFirstRowOfOrder = false;
                    }
                    else {
                        worksheet.addRow([orderName, "", "", "", "", programType, programStartDateFormatted, programLength, note]);
                    }
                }
            }
        }
        yield workbook.xlsx.writeFile(`programs-export-${new Date().getTime()}.xlsx`);
        return res.status(200).json({ message: "Programs exported successfully" });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal server error" });
    }
});
exports.programs = programs;
