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
exports.yesme_draft_order_create = void 0;
const graphql_request_1 = require("graphql-request");
const dotenv_1 = __importDefault(require("dotenv"));
const draftOrders_1 = require("../queries/draftOrders");
dotenv_1.default.config();
const { YESME_STORE, YESME_ACCESS_TOKEN, YESME_API_VERSION, API_VERSION } = process.env;
const API = YESME_API_VERSION || API_VERSION;
const toGid = (type, id) => {
    if (id === undefined || id === null || id === "")
        return null;
    const value = String(id);
    if (value.startsWith("gid://"))
        return value;
    return `gid://shopify/${type}/${value}`;
};
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
const lineB2bPrice = (line) => {
    var _a;
    const fromProp = line.properties && line.properties._b2b_price;
    const raw = (_a = line.b2bPrice) !== null && _a !== void 0 ? _a : fromProp;
    if (raw === undefined || raw === null || raw === "")
        return null;
    const amount = Number(raw);
    if (!Number.isFinite(amount))
        return null;
    return String(raw);
};
const presentmentCurrency = (raw) => {
    const code = String(raw || "CZK").toUpperCase();
    if (code === "EUR" || code === "CZK")
        return code;
    return "CZK";
};
const toAttributes = (raw) => {
    if (!raw || typeof raw !== "object" || Array.isArray(raw))
        return [];
    return Object.entries(raw)
        .filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== "")
        .map(([key, value]) => ({ key: String(key), value: String(value) }));
};
const yesme_draft_order_create = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f;
    try {
        const { items, attributes, currency, customerId, email, companyId, locationId, note } = req.body || {};
        const lines = Array.isArray(items) ? items : [];
        if (!lines.length) {
            return res.status(400).json({ message: "Cart items are required" });
        }
        const currencyCode = presentmentCurrency(currency);
        const lineItems = lines
            .map((line) => {
            const variantId = toGid("ProductVariant", line.variantId);
            const quantity = Number(line.quantity) || 0;
            if (!variantId || quantity < 1)
                return null;
            const item = { variantId, quantity };
            const b2bPrice = lineB2bPrice(line);
            const customAttributes = toAttributes(line.properties || {});
            if (b2bPrice !== null) {
                item.priceOverride = { amount: b2bPrice, currencyCode };
                if (!customAttributes.some((attribute) => attribute.key === "_b2b_price")) {
                    customAttributes.push({ key: "_b2b_price", value: b2bPrice });
                }
            }
            if (customAttributes.length) {
                item.customAttributes = customAttributes;
            }
            return item;
        })
            .filter(Boolean);
        if (!lineItems.length) {
            return res.status(400).json({ message: "No valid cart line items" });
        }
        const client = yesmeClient();
        const customerGid = toGid("Customer", customerId);
        const companyGid = toGid("Company", companyId);
        const locationGid = toGid("CompanyLocation", locationId);
        let taxExempt = false;
        let companyContactId = null;
        if (customerGid) {
            try {
                const customerData = yield client.request(draftOrders_1.yesmeCustomerQuery, { id: customerGid });
                taxExempt = Boolean((_a = customerData === null || customerData === void 0 ? void 0 : customerData.customer) === null || _a === void 0 ? void 0 : _a.taxExempt);
                const profiles = ((_b = customerData === null || customerData === void 0 ? void 0 : customerData.customer) === null || _b === void 0 ? void 0 : _b.companyContactProfiles) || [];
                const match = companyGid
                    ? profiles.find((profile) => { var _a; return ((_a = profile === null || profile === void 0 ? void 0 : profile.company) === null || _a === void 0 ? void 0 : _a.id) === companyGid; })
                    : profiles[0];
                companyContactId = (match === null || match === void 0 ? void 0 : match.id) || null;
            }
            catch (error) {
                console.error("yesme customer lookup failed", error);
            }
        }
        const cartAttributes = toAttributes(attributes);
        const input = {
            lineItems,
            presentmentCurrencyCode: currencyCode,
            tags: ["yesme-storefront"],
            note: note || undefined,
            email: email || undefined,
            taxExempt,
        };
        if (cartAttributes.length) {
            input.customAttributes = cartAttributes;
        }
        const isB2b = Boolean(companyGid && locationGid && companyContactId);
        if (isB2b) {
            input.purchasingEntity = {
                purchasingCompany: {
                    companyId: companyGid,
                    companyLocationId: locationGid,
                    companyContactId,
                },
            };
        }
        else if (customerGid) {
            input.customerId = customerGid;
            input.useCustomerDefaultAddress = true;
        }
        const result = yield client.request(draftOrders_1.yesmeDraftOrderCreateMutation, { input });
        const payload = result === null || result === void 0 ? void 0 : result.draftOrderCreate;
        const userErrors = (payload === null || payload === void 0 ? void 0 : payload.userErrors) || [];
        if (userErrors.length || !((_c = payload === null || payload === void 0 ? void 0 : payload.draftOrder) === null || _c === void 0 ? void 0 : _c.invoiceUrl)) {
            return res.status(400).json({
                message: ((_d = userErrors[0]) === null || _d === void 0 ? void 0 : _d.message) || "Draft order could not be created",
                userErrors,
            });
        }
        return res.status(200).json({
            id: payload.draftOrder.id,
            name: payload.draftOrder.name,
            invoiceUrl: payload.draftOrder.invoiceUrl,
            currency: payload.draftOrder.presentmentCurrencyCode,
        });
    }
    catch (error) {
        console.error("yesme_draft_order_create failed", error);
        const graphQLErrors = (_e = error === null || error === void 0 ? void 0 : error.response) === null || _e === void 0 ? void 0 : _e.errors;
        return res.status(500).json({
            message: ((_f = graphQLErrors === null || graphQLErrors === void 0 ? void 0 : graphQLErrors[0]) === null || _f === void 0 ? void 0 : _f.message) || (error === null || error === void 0 ? void 0 : error.message) || "Draft order create failed",
        });
    }
});
exports.yesme_draft_order_create = yesme_draft_order_create;
