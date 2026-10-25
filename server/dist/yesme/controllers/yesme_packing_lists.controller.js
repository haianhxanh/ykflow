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
exports.yesme_packing_lists = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const crypto_1 = require("crypto");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const email_1 = require("../utils/email");
const packing_slip_storage_1 = require("../../trabucco-fishing/utils/packing_slip_storage");
const delivery_note_1 = require("../utils/delivery_note");
const orders_1 = require("../utils/orders");
dotenv_1.default.config();
const { YESME_PACKING_LIST_RECIPIENTS, YESME_ORDER_EXPORT_RECIPIENTS } = process.env;
const STORE_CONCURRENCY = 3;
// Dodací listy for the same Sunday–Friday window and the same orders as the orders export,
// one per závoz (company location + delivery day). Query options mirror the export:
// date, sendEmail=false, download=true, revised=true, plus store=false to skip Shopify Files.
const yesme_packing_lists = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const window = (0, orders_1.resolveDeliveryWindow)(req.query.date);
        if ("error" in window) {
            return res.status(400).json({ error: window.error });
        }
        if ("skipped" in window) {
            return res.status(200).json({
                skipped: true,
                reason: "Yes Me packing lists run on Thursday only. Pass ?date=YYYY-MM-DD to override.",
                today: window.today,
            });
        }
        const { start, end } = window;
        const client = (0, orders_1.yesmeClient)();
        const orders = yield (0, orders_1.fetchOrders)(client, start, end);
        const notes = (0, delivery_note_1.buildDeliveryNotes)(orders);
        const summary = notes.map((note) => ({
            number: note.number,
            deliveryDate: note.deliveryDate,
            customer: note.customer,
            branch: note.branch,
            orders: note.orderNames,
            totalQuantity: note.totalQuantity,
        }));
        if (!notes.length) {
            return res.status(200).json({ start, end, orders: 0, deliveries: [], emailed: false, stored: [], savedTo: null });
        }
        const shouldStore = req.query.store !== "false";
        const stored = shouldStore ? yield storeNotes(client, notes) : [];
        const fileName = `yesme-dodaci-listy-${start}-to-${end}.xlsx`;
        const workbook = yield (0, delivery_note_1.buildDeliveryNotesWorkbook)(notes);
        const attachment = { type: delivery_note_1.XLSX_MIME, name: fileName, content: workbook.toString("base64") };
        const shouldSendEmail = req.query.sendEmail !== "false";
        const isRevisedDoc = req.query.revised === "true";
        const recipientEmails = (YESME_PACKING_LIST_RECIPIENTS || YESME_ORDER_EXPORT_RECIPIENTS);
        if (shouldSendEmail && recipientEmails) {
            try {
                yield (0, email_1.sendYesmeEmail)(`Yes Me dodací listy ${start} – ${end}${isRevisedDoc ? " (opravné)" : ""}`, recipientEmails, `Dodací listy pro závozy ${(0, orders_1.czechSlashDate)(start)} až ${(0, orders_1.czechSlashDate)(end)} (${notes.length}) jsou v příloze.`, attachment);
            }
            catch (error) {
                console.error("yesme_packing_lists: email failed", error);
                return res
                    .status(502)
                    .json({ start, end, deliveries: summary, stored, emailed: false, error: String((error === null || error === void 0 ? void 0 : error.message) || error) });
            }
        }
        // ?download=true also stores the workbook (one sheet per závoz) in the server's working directory (git-ignored).
        const savedTo = req.query.download === "true" ? path_1.default.resolve(fileName) : null;
        if (savedTo)
            fs_1.default.writeFileSync(savedTo, new Uint8Array(workbook));
        return res.status(200).json({
            start,
            end,
            orders: orders.length,
            deliveries: summary,
            emailed: Boolean(shouldSendEmail && recipientEmails),
            stored,
            savedTo,
            attachment,
        });
    }
    catch (error) {
        console.error("yesme_packing_lists failed", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});
exports.yesme_packing_lists = yesme_packing_lists;
// Uploads each závoz's workbook to Shopify Files and links it on every order in that závoz
// (custom.packing_lists, same as Trabucco). Failures are reported per závoz and never block the email.
const storeNotes = (client, notes) => __awaiter(void 0, void 0, void 0, function* () {
    const today = (0, orders_1.pragueTodayYmd)();
    const results = [];
    for (let index = 0; index < notes.length; index += STORE_CONCURRENCY) {
        const batch = notes.slice(index, index + STORE_CONCURRENCY);
        results.push(...(yield Promise.all(batch.map((note) => __awaiter(void 0, void 0, void 0, function* () {
            try {
                const file = yield (0, delivery_note_1.buildDeliveryNotesWorkbook)([note]);
                // Random suffix keeps the public Shopify CDN URL unguessable.
                const url = yield (0, packing_slip_storage_1.uploadPdfToShopifyFiles)(client, (0, delivery_note_1.deliveryNoteFilename)(note, (0, crypto_1.randomBytes)(6).toString("hex")), file, delivery_note_1.XLSX_MIME);
                for (const orderId of note.orderIds) {
                    yield (0, packing_slip_storage_1.appendPackingListLink)(client, orderId, { text: `${today} (${note.number})`, url });
                }
                return { number: note.number, url };
            }
            catch (error) {
                console.error(`yesme_packing_lists: storing ${note.number} failed`, error);
                return { number: note.number, error: error instanceof Error ? error.message : String(error) };
            }
        })))));
    }
    return results;
});
