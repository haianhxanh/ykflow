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
exports.npfabinipanevgift_report = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const orders_1 = require("../../queries/orders");
const exceljs_1 = __importDefault(require("exceljs"));
dotenv_1.default.config();
const FREE_PAN_SKU = "NPFABINIPANEVGIFT";
const npfabinipanevgift_report = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const allOrders = yield (0, orders_1.allOrdersQuery)("created_at:>=2026-04-03 AND created_at:<2026-04-07");
        const workbook = new exceljs_1.default.Workbook();
        const worksheet = workbook.addWorksheet("Sheet1");
        worksheet.addRow(["Order #", "Order Value", "Free Pans Count"]);
        for (const order of allOrders) {
            const node = order.node;
            const lineItems = node.lineItems.edges;
            const freePanItems = lineItems.filter((item) => { var _a; return ((_a = item.node.variant) === null || _a === void 0 ? void 0 : _a.sku) === FREE_PAN_SKU; });
            if (freePanItems.length === 0)
                continue;
            const freePanCount = freePanItems.reduce((sum, item) => sum + item.node.quantity, 0);
            worksheet.addRow([node.name, node.originalTotalPriceSet.shopMoney.amount, freePanCount]);
        }
        yield workbook.xlsx.writeFile(`npfabinipanevgift-report-${new Date().getTime()}.xlsx`);
        return res.status(200).json({ message: "Export successful" });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal server error" });
    }
});
exports.npfabinipanevgift_report = npfabinipanevgift_report;
