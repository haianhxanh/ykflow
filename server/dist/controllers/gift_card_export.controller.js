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
exports.gift_card_export = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const orders_1 = require("../queries/orders");
const exceljs_1 = __importDefault(require("exceljs"));
dotenv_1.default.config();
const { ACCESS_TOKEN, STORE, API_VERSION } = process.env;
/*-------------------------------------MAIN FUNCTION------------------------------------------------*/
const gift_card_export = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const giftCards = yield (0, orders_1.allGiftCardsQuery)("created_at:>=2025-01-01");
    // const ordersPaidWithGiftCards = await allOrdersQuery("gateway:gift_card AND created_at:>=2025-01-01");
    const workbook = new exceljs_1.default.Workbook();
    const worksheet = workbook.addWorksheet(`giftcards`);
    worksheet.columns = [
        { header: "ID", key: "id", width: 10 },
        { header: "Created At", key: "createdAt", width: 10 },
        { header: "Order", key: "order", width: 10 },
        { header: "Initial Value", key: "initialValue", width: 10 },
    ];
    for (const giftCard of giftCards) {
        worksheet.addRow({
            id: giftCard.node.id,
            createdAt: giftCard.node.createdAt,
            order: ((_a = giftCard.node.order) === null || _a === void 0 ? void 0 : _a.name) || "N/A",
            initialValue: giftCard.node.initialValue.amount,
        });
    }
    workbook.xlsx.writeFile(`giftcards.xlsx`);
    return res.status(200).json({ giftCards });
});
exports.gift_card_export = gift_card_export;
const getYesterday = () => {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    return date.toISOString().split("T")[0];
};
