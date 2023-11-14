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
exports.auth = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const { APP_SECRET_KEY } = process.env;
const auth = (req, res, next) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const access_key = req.headers.authorization;
        const key = access_key.slice(7);
        if (key !== APP_SECRET_KEY) {
            return res.status(401).json({
                message: "INVALID ACCESS KEY. You are not authorized to access this endpoint",
            });
        }
        else if (key === APP_SECRET_KEY) {
            next();
        }
    }
    catch (err) {
        return res.status(401).json({
            message: "INVALID ACCESS KEY. You are not authorized to access this endpoint",
        });
    }
});
exports.auth = auth;
