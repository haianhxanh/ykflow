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
exports.trabucco_delivery_note = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const graphql_request_1 = require("graphql-request");
const orders_1 = require("../queries/orders");
const delivery_note_1 = require("../utils/delivery_note");
dotenv_1.default.config();
const { TRABUCCO_STORE, TRABUCCO_ACCESS_TOKEN, API_VERSION } = process.env;
const toOrderGid = (raw) => {
    const value = raw.trim();
    if (value.startsWith("gid://shopify/Order/"))
        return value;
    if (/^\d+$/.test(value))
        return `gid://shopify/Order/${value}`;
    return value;
};
const trabucco_delivery_note = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        const rawId = (((_a = req.body) === null || _a === void 0 ? void 0 : _a.orderId) || ((_b = req.body) === null || _b === void 0 ? void 0 : _b.id) || req.query.orderId || req.query.id);
        if (!rawId) {
            return res.status(400).json({ error: "orderId is required" });
        }
        const client = new graphql_request_1.GraphQLClient(`https://${TRABUCCO_STORE}/admin/api/${API_VERSION}/graphql.json`, {
            // @ts-ignore
            headers: { "X-Shopify-Access-Token": TRABUCCO_ACCESS_TOKEN },
        });
        const data = (yield client.request(orders_1.trabuccoDeliveryNoteOrderQuery, { id: toOrderGid(rawId) }));
        const order = data === null || data === void 0 ? void 0 : data.order;
        if (!order) {
            return res.status(404).json({ error: "Order not found" });
        }
        // basis=invoice is a narrow escape hatch for orders whose (mathematically imperfect)
        // Fakturoid invoice has already been sent to the client/accountant, so the packing slip
        // doesn't contradict a document they already have. Defaults to the correct Shopify math.
        const rawBasis = (req.query.basis || ((_c = req.body) === null || _c === void 0 ? void 0 : _c.basis));
        const basis = rawBasis === "invoice" ? "invoice" : "shopify";
        const note = (0, delivery_note_1.mapOrderToDeliveryNote)(order, basis);
        const pdf = yield (0, delivery_note_1.buildDeliveryNotePdf)(note);
        const filename = (0, delivery_note_1.deliveryNoteFilename)(order.name);
        if (req.query.format === "json") {
            return res.status(200).json({
                type: "application/pdf",
                name: filename,
                content: pdf.toString("base64"),
            });
        }
        res.setHeader("Content-Type", "application/pdf");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        return res.status(200).send(pdf);
    }
    catch (error) {
        console.error("trabucco_delivery_note failed", error);
        return res.status(500).json({ error: "Failed to generate delivery note" });
    }
});
exports.trabucco_delivery_note = trabucco_delivery_note;
