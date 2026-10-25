"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.yesmeExportOrAdminAuth = exports.yesmeExportAuth = exports.yesmeStorefrontAuth = void 0;
const crypto_1 = require("crypto");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const keysMatch = (provided, expected) => {
    const a = new TextEncoder().encode(provided);
    const b = new TextEncoder().encode(expected);
    return a.length === b.length && (0, crypto_1.timingSafeEqual)(a, b);
};
// Accepts `Authorization: Bearer <key>` or a bare `Authorization: <key>` header.
const bearerToken = (req) => {
    const header = String(req.headers.authorization || "");
    return header.startsWith("Bearer ") ? header.slice(7) : header;
};
const bearerKeyAuth = (envName) => (req, res, next) => {
    try {
        const expected = process.env[envName];
        if (!expected) {
            return res.status(500).json({ message: `${envName} is not configured` });
        }
        if (!keysMatch(bearerToken(req), expected)) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        next();
    }
    catch (err) {
        return res.status(401).json({ message: "Unauthorized" });
    }
};
const base64UrlJson = (part) => JSON.parse(Buffer.from(part, "base64url").toString("utf8"));
// Verifies a Shopify session token (HS256 JWT signed with the app's client secret) issued by the
// yesme-b2b-management admin app for the Yes Me store.
const isValidAdminSessionToken = (token) => {
    var _a;
    const { YESME_APP_CLIENT_ID, YESME_APP_CLIENT_SECRET, YESME_STORE } = process.env;
    if (!YESME_APP_CLIENT_ID || !YESME_APP_CLIENT_SECRET || !YESME_STORE)
        return false;
    const [header, payload, signature] = token.split(".");
    if (!header || !payload || !signature)
        return false;
    if (((_a = base64UrlJson(header)) === null || _a === void 0 ? void 0 : _a.alg) !== "HS256")
        return false;
    const expectedSignature = (0, crypto_1.createHmac)("sha256", YESME_APP_CLIENT_SECRET).update(`${header}.${payload}`).digest("base64url");
    if (!keysMatch(signature, expectedSignature))
        return false;
    const claims = base64UrlJson(payload);
    const now = Math.floor(Date.now() / 1000);
    const leeway = 10;
    if (typeof (claims === null || claims === void 0 ? void 0 : claims.exp) !== "number" || claims.exp + leeway < now)
        return false;
    if (typeof (claims === null || claims === void 0 ? void 0 : claims.nbf) === "number" && claims.nbf - leeway > now)
        return false;
    if ((claims === null || claims === void 0 ? void 0 : claims.aud) !== YESME_APP_CLIENT_ID)
        return false;
    return (claims === null || claims === void 0 ? void 0 : claims.dest) === `https://${YESME_STORE}`;
};
exports.yesmeStorefrontAuth = bearerKeyAuth("YESME_STOREFRONT_KEY");
exports.yesmeExportAuth = bearerKeyAuth("YESME_EXPORT_KEY");
// Export endpoints are called both by the scheduled job (YESME_EXPORT_KEY) and by the admin app
// buttons (Shopify session token).
const yesmeExportOrAdminAuth = (req, res, next) => {
    try {
        const token = bearerToken(req);
        const exportKey = process.env.YESME_EXPORT_KEY;
        if ((exportKey && keysMatch(token, exportKey)) || isValidAdminSessionToken(token)) {
            return next();
        }
        return res.status(401).json({ message: "Unauthorized" });
    }
    catch (err) {
        return res.status(401).json({ message: "Unauthorized" });
    }
};
exports.yesmeExportOrAdminAuth = yesmeExportOrAdminAuth;
