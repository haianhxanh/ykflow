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
exports.get_inquiries = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const inquiry_model_1 = __importDefault(require("../model/inquiry.model"));
dotenv_1.default.config();
/*-------------------------------------GET INQUIRIES FROM DATABASE------------------------------------------------*/
const get_inquiries = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const data = yield inquiry_model_1.default.findAll({ order: [["createdAt", "DESC"]] });
        const db_data = data.map((db_data) => {
            return db_data.dataValues;
        });
        return res.status(200).json(db_data);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal server error" });
    }
});
exports.get_inquiries = get_inquiries;
