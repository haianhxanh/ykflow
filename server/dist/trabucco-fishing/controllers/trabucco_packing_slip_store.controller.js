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
exports.trabucco_packing_slip_store = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const graphql_request_1 = require("graphql-request");
const orders_1 = require("../queries/orders");
const packing_slip_1 = require("../utils/packing_slip");
const packing_slip_storage_1 = require("../utils/packing_slip_storage");
const trabucco_packing_slip_controller_1 = require("./trabucco_packing_slip.controller");
dotenv_1.default.config();
const { TRABUCCO_STORE, TRABUCCO_ACCESS_TOKEN, API_VERSION } = process.env;
// Generates the packing slip for an order, stores the PDF in Shopify Files and appends
// { text: "YYYY-MM-DD", url } to the order's custom.packing_lists metafield.
const trabucco_packing_slip_store = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    var _c;
    try {
        const rawId = (((_a = req.body) === null || _a === void 0 ? void 0 : _a.orderId) || ((_b = req.body) === null || _b === void 0 ? void 0 : _b.id) || req.query.orderId || req.query.id);
        if (!rawId)
            return res.status(400).json({ error: "orderId is required" });
        const client = new graphql_request_1.GraphQLClient(`https://${TRABUCCO_STORE}/admin/api/${API_VERSION}/graphql.json`, {
            // @ts-ignore
            headers: { "X-Shopify-Access-Token": TRABUCCO_ACCESS_TOKEN },
        });
        const orderGid = (0, trabucco_packing_slip_controller_1.toOrderGid)(rawId);
        const data = (yield client.request(orders_1.trabuccoPackingSlipOrderQuery, { id: orderGid }));
        const order = data === null || data === void 0 ? void 0 : data.order;
        if (!order)
            return res.status(404).json({ error: "Order not found" });
        const prague = (d, locale) => new Intl.DateTimeFormat(locale, { timeZone: "Europe/Prague" }).format(d);
        const now = new Date();
        const date = prague(now, "sv-SE"); // YYYY-MM-DD, description of the metafield link
        // Filename = numeric order ID (not guessable from the order name) + date of the latest
        // fulfillment, e.g. dodaci-list-7727514583336-20260915.pdf. Falls back to today when the
        // order isn't fulfilled yet (manual generation).
        const fulfilledAt = ((_c = order.fulfillments) !== null && _c !== void 0 ? _c : [])
            .map((f) => new Date(f.createdAt))
            .sort((a, b) => b.getTime() - a.getTime())[0];
        const fileDate = prague(fulfilledAt !== null && fulfilledAt !== void 0 ? fulfilledAt : now, "sv-SE").replace(/-/g, "");
        const numericId = orderGid.split("/").pop();
        const pdf = yield (0, packing_slip_1.buildPackingSlipPdf)((0, packing_slip_1.mapOrderToPackingSlip)(order));
        const filename = (0, packing_slip_1.packingSlipFilename)(`${numericId}-${fileDate}`);
        const url = yield (0, packing_slip_storage_1.uploadPdfToShopifyFiles)(client, filename, pdf);
        const links = yield (0, packing_slip_storage_1.appendPackingListLink)(client, orderGid, { text: date, url });
        return res.status(200).json({ order: order.name, url, links });
    }
    catch (error) {
        console.error("trabucco_packing_slip_store failed", error);
        return res.status(500).json({ error: "Failed to store packing slip" });
    }
});
exports.trabucco_packing_slip_store = trabucco_packing_slip_store;
