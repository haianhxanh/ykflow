"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const get_inquiry_controller_1 = require("../controllers/get_inquiry.controller");
const receive_inquiry_controller_1 = require("../controllers/receive_inquiry.controller");
const authorization_1 = require("../authorization/authorization");
const update_inquiry_controller_1 = require("../controllers/update_inquiry.controller");
const router = express_1.default.Router();
router.get("/inquiries", authorization_1.auth, get_inquiry_controller_1.get_inquiries);
router.post("/inquiry/new", receive_inquiry_controller_1.receive_inquiry);
router.put("/inquiry/update", authorization_1.auth, update_inquiry_controller_1.update_inquiry);
exports.default = router;
