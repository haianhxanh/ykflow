"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.yesmeExportAuth = exports.yesmeStorefrontAuth = void 0;
const crypto_1 = require("crypto");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const keysMatch = (provided, expected) => {
    const a = new TextEncoder().encode(provided);
    const b = new TextEncoder().encode(expected);
    return a.length === b.length && (0, crypto_1.timingSafeEqual)(a, b);
};
// Accepts `Authorization: Bearer <key>` or a bare `Authorization: <key>` header.
const bearerKeyAuth = (envName) => (req, res, next) => {
    try {
        const expected = process.env[envName];
        if (!expected) {
            return res.status(500).json({ message: `${envName} is not configured` });
        }
        const header = String(req.headers.authorization || "");
        const key = header.startsWith("Bearer ") ? header.slice(7) : header;
        if (!keysMatch(key, expected)) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        next();
    }
    catch (err) {
        return res.status(401).json({ message: "Unauthorized" });
    }
};
exports.yesmeStorefrontAuth = bearerKeyAuth("YESME_STOREFRONT_KEY");
exports.yesmeExportAuth = bearerKeyAuth("YESME_EXPORT_KEY");
