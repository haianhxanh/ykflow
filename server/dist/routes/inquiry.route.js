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
const get_order_inquiries_controller_1 = require("../controllers/get_order_inquiries.controller");
const delete_inquiry_controller_1 = require("../controllers/delete_inquiry.controller");
const fulfill_order_controller_1 = require("../controllers/fulfill_order.controller");
const orders_export_controller_1 = require("../controllers/orders_export.controller");
const order_update_attributes_controller_1 = require("../controllers/order_update_attributes.controller");
const checkout_address_validation_controller_1 = require("../controllers/checkout_address_validation.controller");
const checkout_pickup_availability_check_controller_1 = require("../controllers/checkout_pickup_availability_check.controller");
const express_checkout_address_validation_request_controller_1 = require("../controllers/express_checkout_address_validation_request.controller");
const meal_rating_controller_1 = require("../controllers/meal_rating.controller");
const campaign_fuck_cancer_controller_1 = require("../controllers/campaign_fuck_cancer.controller");
const router = express_1.default.Router();
router.get("/inquiries", authorization_1.auth, get_inquiry_controller_1.get_inquiries);
router.post("/inquiry/new", receive_inquiry_controller_1.receive_inquiry);
router.put("/inquiry/update", authorization_1.auth, update_inquiry_controller_1.update_inquiry);
router.post("/inquiry/delete", authorization_1.auth, delete_inquiry_controller_1.delete_inquiry);
router.get("/order-inquiries?:order_id", get_order_inquiries_controller_1.get_order_inquiries);
router.get("/fulfill", fulfill_order_controller_1.fulfill);
router.get("/orders/export", orders_export_controller_1.orders_export);
router.get("/order/update/attributes", order_update_attributes_controller_1.order_update_attributes);
router.post("/checkout/address/validation", checkout_address_validation_controller_1.checkout_address_validation);
router.get("/checkout/pickup/availability/check", checkout_pickup_availability_check_controller_1.checkout_pickup_availability_check);
router.get("/express-checkout/address-validation/request", express_checkout_address_validation_request_controller_1.express_checkout_address_validation_request);
router.post("/meal/rating", meal_rating_controller_1.meal_rating);
router.post("/campaigns/fuck-cancer", campaign_fuck_cancer_controller_1.campaign_fuck_cancer);
exports.default = router;
