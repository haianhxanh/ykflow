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
const checkout_pickup_availability_check_controller_1 = require("../controllers/checkout_pickup_availability_check.controller");
const checkout_address_validation_controller_1 = require("../controllers/checkout_address_validation.controller");
const router = express_1.default.Router();
// const checkoutPickupAvailabilityLimiter = rateLimit({
//   windowMs: 5 * 1000,
//   max: 1,
//   keyGenerator: (req) => {
//     return `${req.query.selectedPickupLocation}-${req.query.startDate}`;
//   },
//   handler: (req, res) => {
//     res
//       .status(429)
//       .json({ message: "Too many requests, please try again later." });
//   },
// });
router.get("/inquiries", authorization_1.auth, get_inquiry_controller_1.get_inquiries);
router.post("/inquiry/new", receive_inquiry_controller_1.receive_inquiry);
router.put("/inquiry/update", authorization_1.auth, update_inquiry_controller_1.update_inquiry);
router.post("/inquiry/delete", authorization_1.auth, delete_inquiry_controller_1.delete_inquiry);
router.get("/order-inquiries?:order_id", get_order_inquiries_controller_1.get_order_inquiries);
router.get("/fulfill", fulfill_order_controller_1.fulfill);
router.get("/orders/export", orders_export_controller_1.orders_export);
router.get("/order/update/attributes", order_update_attributes_controller_1.order_update_attributes);
// router.get(
//   "/checkout/pickup/availability/check",
//   checkoutPickupAvailabilityLimiter,
//   checkout_pickup_availability_check
// );
let debounceTimeout = null;
let lastRequest = null;
// const debounceMiddleware = (
//   req: express.Request,
//   res: express.Response,
//   next: express.NextFunction
// ) => {
//   if (debounceTimeout) {
//     clearTimeout(debounceTimeout);
//   }
//   lastRequest = { req, res };
//   debounceTimeout = setTimeout(async () => {
//     if (lastRequest) {
//       const { req: lastReq, res: lastRes } = lastRequest;
//       lastRequest = null;
//       await checkout_pickup_availability_check(lastReq, lastRes);
//     }
//   }, 5000); // 5 seconds debounce time
//   res.status(202).json({
//     message: "Request received, processing will occur after debounce period.",
//   });
// };
// router.get("/checkout/pickup/availability/check", debounceMiddleware);
const debounceMiddleware = (req, res, next) => {
    if (debounceTimeout) {
        clearTimeout(debounceTimeout);
    }
    lastRequest = { req, res };
    debounceTimeout = setTimeout(() => __awaiter(void 0, void 0, void 0, function* () {
        if (lastRequest) {
            const { req: lastReq, res: lastRes } = lastRequest;
            lastRequest = null;
            yield (0, checkout_pickup_availability_check_controller_1.checkout_pickup_availability_check)(lastReq, lastRes);
        }
    }), 5000); // 5 seconds debounce time
};
router.get("/checkout/pickup/availability/check", debounceMiddleware, (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (lastRequest && lastRequest.req === req) {
        yield (0, checkout_pickup_availability_check_controller_1.checkout_pickup_availability_check)(req, res);
    }
    else {
        res.status(202).json({
            message: "Request received, processing will occur after debounce period.",
        });
    }
}));
router.post("/checkout/address/validation", checkout_address_validation_controller_1.checkout_address_validation);
exports.default = router;
