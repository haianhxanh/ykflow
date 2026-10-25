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
exports.metafieldText = exports.countryName = exports.zip = exports.street = exports.czechSlashDate = exports.toExcelDate = exports.parseDeliveryDate = exports.isoToYmd = exports.pragueTodayYmd = exports.fetchOrders = exports.resolveDeliveryWindow = exports.yesmeClient = exports.PRAGUE_TZ = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const graphql_request_1 = require("graphql-request");
const util_1 = require("util");
const orders_1 = require("../queries/orders");
dotenv_1.default.config();
// Shared by the orders export and the packing lists, so both always cover exactly the same orders.
const { YESME_STORE, YESME_ACCESS_TOKEN, YESME_API_VERSION, API_VERSION } = process.env;
const API = YESME_API_VERSION || API_VERSION;
exports.PRAGUE_TZ = "Europe/Prague";
const DISALLOWED_FINANCIAL_STATUSES = ["VOIDED", "EXPIRED", "REFUNDED"];
const sleep = (0, util_1.promisify)(setTimeout);
const yesmeClient = () => {
    if (!YESME_STORE || !YESME_ACCESS_TOKEN) {
        throw new Error("YESME_STORE or YESME_ACCESS_TOKEN is not configured");
    }
    return new graphql_request_1.GraphQLClient(`https://${YESME_STORE}/admin/api/${API}/graphql.json`, {
        // @ts-ignore
        headers: {
            "X-Shopify-Access-Token": YESME_ACCESS_TOKEN,
        },
    });
};
exports.yesmeClient = yesmeClient;
// Resolves ?date into the delivery window. Without a date it only runs on Thursday (Shopify Flow
// trigger day); on other days it returns `skipped` so an accidental trigger does nothing.
const resolveDeliveryWindow = (rawQueryDate) => {
    const rawDate = typeof rawQueryDate === "string" ? rawQueryDate.trim() : "";
    const dateParam = rawDate ? parseDateParam(rawDate) : "";
    if (rawDate && !dateParam)
        return { error: "date must be YYYY-MM-DD or D.M.YYYY" };
    const referenceYmd = dateParam || (0, exports.pragueTodayYmd)();
    if (!dateParam && !isThursday(referenceYmd))
        return { skipped: true, today: referenceYmd };
    return deliveryWindow(referenceYmd);
};
exports.resolveDeliveryWindow = resolveDeliveryWindow;
const fetchOrders = (client, start, end) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const query = `-status:cancelled AND metafields.delivery.date:>=${start} AND metafields.delivery.date:<=${end}`;
    let cursor = null;
    let hasNextPage = true;
    const orders = [];
    while (hasNextPage) {
        const data = yield client.request(orders_1.yesmeOrdersExportQuery, { query, cursor });
        const page = data === null || data === void 0 ? void 0 : data.orders;
        for (const edge of (page === null || page === void 0 ? void 0 : page.edges) || []) {
            orders.push(edge.node);
        }
        hasNextPage = Boolean((_a = page === null || page === void 0 ? void 0 : page.pageInfo) === null || _a === void 0 ? void 0 : _a.hasNextPage);
        cursor = ((_b = page === null || page === void 0 ? void 0 : page.pageInfo) === null || _b === void 0 ? void 0 : _b.endCursor) || null;
        if (hasNextPage)
            yield sleep(300);
    }
    return orders.filter((order) => {
        var _a;
        if (order === null || order === void 0 ? void 0 : order.cancelledAt)
            return false;
        if (DISALLOWED_FINANCIAL_STATUSES.includes(order === null || order === void 0 ? void 0 : order.displayFinancialStatus))
            return false;
        const deliveryYmd = (0, exports.parseDeliveryDate)((_a = order === null || order === void 0 ? void 0 : order.deliveryDate) === null || _a === void 0 ? void 0 : _a.jsonValue);
        return Boolean(deliveryYmd && deliveryYmd >= start && deliveryYmd <= end);
    });
});
exports.fetchOrders = fetchOrders;
const pragueTodayYmd = () => new Intl.DateTimeFormat("en-CA", {
    timeZone: exports.PRAGUE_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
}).format(new Date());
exports.pragueTodayYmd = pragueTodayYmd;
const ymdToUtcDate = (ymd) => {
    const [year, month, day] = ymd.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
};
const formatYmd = (date) => date.toISOString().slice(0, 10);
const addDays = (ymd, days) => {
    const date = ymdToUtcDate(ymd);
    date.setUTCDate(date.getUTCDate() + days);
    return formatYmd(date);
};
const weekdayUtc = (ymd) => ymdToUtcDate(ymd).getUTCDay();
const isThursday = (ymd) => weekdayUtc(ymd) === 4;
// Sunday that closes the reference date's Mon–Sun week, through the following Friday.
// e.g. Thursday 2026-09-17 → Sunday 2026-09-20 … Friday 2026-09-25.
const deliveryWindow = (referenceYmd) => {
    const daysToSunday = (7 - weekdayUtc(referenceYmd)) % 7;
    const start = addDays(referenceYmd, daysToSunday);
    return { start, end: addDays(start, 5) };
};
const parseDateParam = (value) => {
    const ymd = (0, exports.parseDeliveryDate)(value);
    if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd))
        return null;
    return formatYmd(ymdToUtcDate(ymd)) === ymd ? ymd : null;
};
const isoToYmd = (iso) => {
    if (!iso)
        return "";
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: exports.PRAGUE_TZ,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(new Date(iso));
};
exports.isoToYmd = isoToYmd;
const parseDeliveryDate = (raw) => {
    if (raw == null || raw === "")
        return null;
    const value = String(raw).trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(value))
        return value.slice(0, 10);
    const match = value.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
    if (!match)
        return null;
    const day = match[1].padStart(2, "0");
    const month = match[2].padStart(2, "0");
    const year = match[3].length === 2 ? `20${match[3]}` : match[3];
    return `${year}-${month}-${day}`;
};
exports.parseDeliveryDate = parseDeliveryDate;
// Excel stores dates without a timezone; build them at UTC midnight so the cell shows the same calendar
// day regardless of the server's timezone (local midnight in Prague would show the previous day).
const toExcelDate = (ymd) => {
    if (!ymd)
        return "";
    const [year, month, day] = ymd.split("-").map(Number);
    return new Date(Date.UTC(year, month - 1, day));
};
exports.toExcelDate = toExcelDate;
const czechSlashDate = (ymd) => {
    const [year, month, day] = ymd.split("-");
    return `${Number(day)}.${Number(month)}.${year}`;
};
exports.czechSlashDate = czechSlashDate;
const street = (address) => {
    if (!address)
        return "";
    return [address.address1, address.address2].filter((part) => Boolean(part && String(part).trim())).join(" ");
};
exports.street = street;
const zip = (value) => (value ? String(value).replace(/\s/g, "") : "");
exports.zip = zip;
const countryName = (address) => {
    const code = address === null || address === void 0 ? void 0 : address.countryCodeV2;
    if (code === "CZ")
        return "Česko";
    if (code === "SK")
        return "Slovensko";
    return (address === null || address === void 0 ? void 0 : address.country) || "";
};
exports.countryName = countryName;
const metafieldText = (value) => {
    if (value == null || value === "")
        return "";
    return String(value);
};
exports.metafieldText = metafieldText;
