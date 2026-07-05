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
exports.gift_card_balance_report = void 0;
const exceljs_1 = __importDefault(require("exceljs"));
const orders_1 = require("../queries/orders");
const giftCardAdminBaseUrl = "https://admin.shopify.com/store/yes-krabicky/gift_cards";
const gift_card_balance_report = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const asOfDate = req.query.asOf || "2025-12-31";
        const createdFrom = req.query.createdFrom || "2025-01-01";
        const includeXlsx = req.query.format === "xlsx";
        const createdBefore = `${asOfDate}T23:59:59Z`;
        const query = `created_at:>=${createdFrom} AND created_at:<=${createdBefore}`;
        const giftCards = yield (0, orders_1.allGiftCardsQuery)(query);
        const processed = giftCards
            .map((giftCard) => giftCard.node)
            .filter((giftCard) => new Date(giftCard.createdAt) <= new Date(createdBefore))
            .map((giftCard) => {
            var _a, _b, _c;
            const initialValue = Number(((_a = giftCard.initialValue) === null || _a === void 0 ? void 0 : _a.amount) || 0);
            const balance = Number(((_b = giftCard.balance) === null || _b === void 0 ? void 0 : _b.amount) || 0);
            const giftCardNumericId = giftCard.id.split("/").pop();
            return {
                url: giftCardNumericId ? `${giftCardAdminBaseUrl}/${giftCardNumericId}` : giftCard.id,
                createdAt: giftCard.createdAt,
                order: ((_c = giftCard.order) === null || _c === void 0 ? void 0 : _c.name) || "N/A",
                initialValue,
                balance,
            };
        });
        const allUnspentTotal = processed.reduce((acc, giftCard) => acc + giftCard.balance, 0);
        const summary = {
            asOf: asOfDate,
            createdFrom,
            allUnspentTotal: Number(allUnspentTotal.toFixed(2)),
            count: processed.length,
            dphNote: "Gift card values are nominal balances and do not represent VAT split (with/without VAT).",
        };
        if (!includeXlsx) {
            return res.status(200).json({ summary, giftCards: processed });
        }
        const workbook = new exceljs_1.default.Workbook();
        const summarySheet = workbook.addWorksheet("summary");
        summarySheet.columns = [
            { header: "Metoda", key: "metric", width: 45 },
            { header: "Hodnota", key: "value", width: 30 },
        ];
        summarySheet.addRows([
            { metric: "Stav k datu", value: summary.asOf },
            { metric: "Vytvoreno od", value: summary.createdFrom },
            { metric: "Nevycerpane poukazy celkem", value: summary.allUnspentTotal },
            { metric: "Pocet poukazu", value: summary.count },
            { metric: "Poznamka k DPH", value: summary.dphNote },
        ]);
        const detailSheet = workbook.addWorksheet("giftcards");
        detailSheet.columns = [
            { header: "URL", key: "url", width: 60 },
            { header: "Vytvoreno", key: "createdAt", width: 24 },
            { header: "Objednavka", key: "order", width: 20 },
            { header: "Pocatecni hodnota", key: "initialValue", width: 18 },
            { header: "Zustatek", key: "balance", width: 14 },
        ];
        detailSheet.addRows(processed);
        const fileName = `giftcards-balance-report-${asOfDate}.xlsx`;
        yield workbook.xlsx.writeFile(fileName);
        const buffer = yield workbook.xlsx.writeBuffer();
        const base64Content = Buffer.from(buffer).toString("base64");
        const attachment = {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            name: fileName,
            content: base64Content,
        };
        return res.status(200).json({ summary, attachment });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal server error" });
    }
});
exports.gift_card_balance_report = gift_card_balance_report;
