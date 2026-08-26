"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.yesmeStorefrontAuth = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const yesmeStorefrontAuth = (req, res, next) => {
    try {
        const expected = process.env.YESME_STOREFRONT_KEY;
        if (!expected) {
            return res.status(500).json({ message: "YESME_STOREFRONT_KEY is not configured" });
        }
        const header = String(req.headers.authorization || "");
        const key = header.startsWith("Bearer ") ? header.slice(7) : header;
        if (key !== expected) {
            return res.status(401).json({ message: "Unauthorized" });
        }
        next();
    }
    catch (err) {
        return res.status(401).json({ message: "Unauthorized" });
    }
};
exports.yesmeStorefrontAuth = yesmeStorefrontAuth;
