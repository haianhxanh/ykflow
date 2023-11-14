"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const get_inquiry_controller_1 = require("../controllers/get_inquiry.controller");
const router = express_1.default.Router();
router.get("/pozadavky", get_inquiry_controller_1.get_inquiries);
exports.default = router;
