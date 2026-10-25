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
exports.yesme_orders_export = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const exceljs_1 = __importDefault(require("exceljs"));
const path_1 = __importDefault(require("path"));
const email_1 = require("../utils/email");
const orders_1 = require("../utils/orders");
dotenv_1.default.config();
const { YESME_ORDER_EXPORT_RECIPIENTS } = process.env;
const COLUMNS = [
    { header: "Č. Objednávky", key: "orderNumber", width: 15 },
    { header: "Datum objednávky", key: "orderDate", width: 16 },
    { header: "Datum dodání", key: "deliveryDate", width: 16 },
    { header: "Jméno", key: "firstName", width: 16 },
    { header: "Příjmení", key: "lastName", width: 16 },
    { header: "Firma", key: "company", width: 18 },
    { header: "IČ", key: "ico", width: 14 },
    { header: "DIČ", key: "dic", width: 14 },
    { header: "Ulice (FAK)", key: "billingStreet", width: 18 },
    { header: "Město (FAK)", key: "billingCity", width: 16 },
    { header: "PSČ (FAK)", key: "billingZip", width: 14 },
    { header: "Země (FAK)", key: "billingCountry", width: 14 },
    { header: "Ulice (DOD)", key: "shippingStreet", width: 18 },
    { header: "Město (DOD)", key: "shippingCity", width: 16 },
    { header: "PSČ (DOD)", key: "shippingZip", width: 14 },
    { header: "Země (DOD)", key: "shippingCountry", width: 14 },
    { header: "Kontaktní telefon pro dopravce", key: "phone", width: 22 },
    { header: "Poznámka pro dopravce", key: "carrierNote", width: 22 },
    { header: "Dodací okno start", key: "windowStart", width: 16 },
    { header: "Dodací okno stop", key: "windowStop", width: 16 },
    { header: "Produkt", key: "product", width: 40 },
    { header: "Počet ks", key: "quantity", width: 12 },
    { header: "Typ rukávu", key: "sleeveType", width: 16 },
    { header: "Ceník", key: "priceList", width: 18 },
    { header: "Jednotková cena", key: "unitPrice", width: 16 },
    { header: "Cena Celkem", key: "lineTotal", width: 16 },
];
const yesme_orders_export = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const window = (0, orders_1.resolveDeliveryWindow)(req.query.date);
        if ("error" in window) {
            return res.status(400).json({ error: window.error });
        }
        if ("skipped" in window) {
            return res.status(200).json({
                skipped: true,
                reason: "Yes Me export runs on Thursday only. Pass ?date=YYYY-MM-DD to override.",
                today: window.today,
            });
        }
        const { start, end } = window;
        const client = (0, orders_1.yesmeClient)();
        const orders = yield (0, orders_1.fetchOrders)(client, start, end);
        const rows = orders.flatMap((order) => orderToRows(order, start, end));
        const workbook = new exceljs_1.default.Workbook();
        const worksheet = workbook.addWorksheet(`Objednávky ${(0, orders_1.czechSlashDate)(start).replace(/\d{4}$/, "")}–${(0, orders_1.czechSlashDate)(end)}`);
        worksheet.columns = COLUMNS;
        for (const row of rows) {
            const added = worksheet.addRow(row);
            added.getCell("orderDate").numFmt = "DD.MM.YYYY";
            added.getCell("deliveryDate").numFmt = "DD.MM.YYYY";
            added.getCell("unitPrice").numFmt = "0.00";
            added.getCell("lineTotal").numFmt = "0.00";
        }
        const fileName = `yesme-orders-${start}-to-${end}.xlsx`;
        const buffer = yield workbook.xlsx.writeBuffer();
        const attachment = {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            name: fileName,
            content: Buffer.from(buffer).toString("base64"),
        };
        const shouldSendEmail = req.query.sendEmail !== "false";
        const isRevisedDoc = req.query.revised === "true";
        const recipientEmails = YESME_ORDER_EXPORT_RECIPIENTS;
        if (shouldSendEmail && recipientEmails) {
            try {
                yield (0, email_1.sendYesmeEmail)(`Yes Me objednávky ${start} – ${end}${isRevisedDoc ? " (opravný export)" : ""}`, recipientEmails, `Objednávky s datem dodání ${(0, orders_1.czechSlashDate)(start)} až ${(0, orders_1.czechSlashDate)(end)} jsou připraveny k exportu.`, attachment);
            }
            catch (error) {
                console.error("yesme_orders_export: email failed", error);
                return res.status(502).json({ start, end, orders: orders.length, emailed: false, error: String((error === null || error === void 0 ? void 0 : error.message) || error) });
            }
        }
        // ?download=true also stores the .xlsx in the server's working directory (git-ignored).
        const savedTo = req.query.download === "true" ? path_1.default.resolve(fileName) : null;
        if (savedTo)
            yield workbook.xlsx.writeFile(savedTo);
        return res.status(200).json({
            start,
            end,
            orders: orders.length,
            rows: rows.length,
            emailed: Boolean(shouldSendEmail && recipientEmails),
            savedTo,
            attachment,
        });
    }
    catch (error) {
        console.error("yesme_orders_export failed", error);
        return res.status(500).json({ error: "Internal server error" });
    }
});
exports.yesme_orders_export = yesme_orders_export;
const orderToRows = (order, start, end) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p;
    const deliveryYmd = (0, orders_1.parseDeliveryDate)((_a = order === null || order === void 0 ? void 0 : order.deliveryDate) === null || _a === void 0 ? void 0 : _a.jsonValue);
    if (!deliveryYmd || deliveryYmd < start || deliveryYmd > end)
        return [];
    const billing = order === null || order === void 0 ? void 0 : order.billingAddress;
    const shipping = order === null || order === void 0 ? void 0 : order.shippingAddress;
    const company = (_b = order === null || order === void 0 ? void 0 : order.purchasingEntity) === null || _b === void 0 ? void 0 : _b.company;
    const location = (_c = order === null || order === void 0 ? void 0 : order.purchasingEntity) === null || _c === void 0 ? void 0 : _c.location;
    const orderNumber = String((order === null || order === void 0 ? void 0 : order.name) || "").replace(/^#/, "");
    const firstName = (shipping === null || shipping === void 0 ? void 0 : shipping.firstName) || (billing === null || billing === void 0 ? void 0 : billing.firstName) || ((_d = order === null || order === void 0 ? void 0 : order.customer) === null || _d === void 0 ? void 0 : _d.firstName) || splitName((shipping === null || shipping === void 0 ? void 0 : shipping.name) || (billing === null || billing === void 0 ? void 0 : billing.name)).firstName;
    const lastName = (shipping === null || shipping === void 0 ? void 0 : shipping.lastName) || (billing === null || billing === void 0 ? void 0 : billing.lastName) || ((_e = order === null || order === void 0 ? void 0 : order.customer) === null || _e === void 0 ? void 0 : _e.lastName) || splitName((shipping === null || shipping === void 0 ? void 0 : shipping.name) || (billing === null || billing === void 0 ? void 0 : billing.name)).lastName;
    const shared = {
        orderNumber,
        orderDate: (0, orders_1.toExcelDate)((0, orders_1.isoToYmd)(order === null || order === void 0 ? void 0 : order.createdAt)),
        deliveryDate: (0, orders_1.toExcelDate)(deliveryYmd),
        firstName: firstName || "",
        lastName: lastName || "",
        company: (company === null || company === void 0 ? void 0 : company.name) || (shipping === null || shipping === void 0 ? void 0 : shipping.company) || (billing === null || billing === void 0 ? void 0 : billing.company) || "",
        ico: (0, orders_1.metafieldText)((_f = company === null || company === void 0 ? void 0 : company.ico) === null || _f === void 0 ? void 0 : _f.jsonValue),
        dic: (0, orders_1.metafieldText)((_g = company === null || company === void 0 ? void 0 : company.dic) === null || _g === void 0 ? void 0 : _g.jsonValue),
        billingStreet: (0, orders_1.street)(billing),
        billingCity: (billing === null || billing === void 0 ? void 0 : billing.city) || "",
        billingZip: (0, orders_1.zip)(billing === null || billing === void 0 ? void 0 : billing.zip),
        billingCountry: (0, orders_1.countryName)(billing),
        shippingStreet: (0, orders_1.street)(shipping),
        shippingCity: (shipping === null || shipping === void 0 ? void 0 : shipping.city) || "",
        shippingZip: (0, orders_1.zip)(shipping === null || shipping === void 0 ? void 0 : shipping.zip),
        shippingCountry: (0, orders_1.countryName)(shipping),
        phone: (shipping === null || shipping === void 0 ? void 0 : shipping.phone) || ((_j = (_h = order === null || order === void 0 ? void 0 : order.customer) === null || _h === void 0 ? void 0 : _h.defaultPhoneNumber) === null || _j === void 0 ? void 0 : _j.phoneNumber) || "",
        carrierNote: (0, orders_1.metafieldText)((_k = location === null || location === void 0 ? void 0 : location.carrierNote) === null || _k === void 0 ? void 0 : _k.jsonValue),
        windowStart: "",
        windowStop: "",
        sleeveType: (0, orders_1.metafieldText)((_o = (_m = (_l = location === null || location === void 0 ? void 0 : location.priceList) === null || _l === void 0 ? void 0 : _l.reference) === null || _m === void 0 ? void 0 : _m.sleeveType) === null || _o === void 0 ? void 0 : _o.jsonValue),
        priceList: priceListName(location),
    };
    return (((_p = order === null || order === void 0 ? void 0 : order.lineItems) === null || _p === void 0 ? void 0 : _p.edges) || [])
        .map((edge) => edge === null || edge === void 0 ? void 0 : edge.node)
        .filter((line) => line && Number(line.quantity) > 0)
        .map((line) => {
        const quantity = Number(line.quantity) || 0;
        const unitPrice = lineUnitPrice(line);
        return Object.assign(Object.assign({}, shared), { product: line.title || "", quantity,
            unitPrice, lineTotal: roundMoney(quantity * unitPrice) });
    });
};
const splitName = (name) => {
    const parts = String(name || "")
        .trim()
        .split(/\s+/);
    if (!parts[0])
        return { firstName: "", lastName: "" };
    if (parts.length === 1)
        return { firstName: parts[0], lastName: "" };
    return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
};
const priceListName = (location) => {
    var _a, _b;
    const reference = (_a = location === null || location === void 0 ? void 0 : location.priceList) === null || _a === void 0 ? void 0 : _a.reference;
    if (!reference)
        return "";
    const named = (_b = reference === null || reference === void 0 ? void 0 : reference.name) === null || _b === void 0 ? void 0 : _b.jsonValue;
    if (named != null && String(named).trim() !== "")
        return String(named);
    return reference.displayName || reference.handle || "";
};
const lineUnitPrice = (line) => {
    var _a, _b, _c, _d;
    const fromProp = (_b = (_a = line === null || line === void 0 ? void 0 : line.customAttributes) === null || _a === void 0 ? void 0 : _a.find((attribute) => attribute.key === "_b2b_price")) === null || _b === void 0 ? void 0 : _b.value;
    const parsed = Number(fromProp);
    if (Number.isFinite(parsed))
        return parsed;
    const fallback = Number((_d = (_c = line === null || line === void 0 ? void 0 : line.discountedUnitPriceSet) === null || _c === void 0 ? void 0 : _c.shopMoney) === null || _d === void 0 ? void 0 : _d.amount);
    return Number.isFinite(fallback) ? fallback : 0;
};
const roundMoney = (value) => Math.round(value * 100) / 100;
