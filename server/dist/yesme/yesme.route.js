"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const yesme_auth_1 = require("./yesme.auth");
const yesme_draft_order_create_controller_1 = require("./controllers/yesme_draft_order_create.controller");
const router = express_1.default.Router();
router.post("/draft-order/create", yesme_auth_1.yesmeStorefrontAuth, yesme_draft_order_create_controller_1.yesme_draft_order_create);
exports.default = router;
