import express from "express";
import rateLimit from "express-rate-limit";
import { get_inquiries } from "../controllers/get_inquiry.controller";
import { receive_inquiry } from "../controllers/receive_inquiry.controller";
import { auth } from "../authorization/authorization";
import { update_inquiry } from "../controllers/update_inquiry.controller";
import { get_order_inquiries } from "../controllers/get_order_inquiries.controller";
import { delete_inquiry } from "../controllers/delete_inquiry.controller";
import { fulfill } from "../controllers/fulfill_order.controller";
import { orders_export } from "../controllers/orders_export.controller";
import { order_update_attributes } from "../controllers/order_update_attributes.controller";
import { checkout_pickup_availability_check } from "../controllers/checkout_pickup_availability_check.controller";
import { checkout_address_validation } from "../controllers/checkout_address_validation.controller";

const router = express.Router();
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

router.get("/inquiries", auth, get_inquiries);
router.post("/inquiry/new", receive_inquiry);
router.put("/inquiry/update", auth, update_inquiry);
router.post("/inquiry/delete", auth, delete_inquiry);
router.get("/order-inquiries?:order_id", get_order_inquiries);
router.get("/fulfill", fulfill);
router.get("/orders/export", orders_export);
router.get("/order/update/attributes", order_update_attributes);
// router.get(
//   "/checkout/pickup/availability/check",
//   checkoutPickupAvailabilityLimiter,
//   checkout_pickup_availability_check
// );

let debounceTimeout: NodeJS.Timeout | null = null;
let lastRequest: { req: express.Request; res: express.Response } | null = null;

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

const debounceMiddleware = (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  if (debounceTimeout) {
    clearTimeout(debounceTimeout);
  }

  lastRequest = { req, res };

  debounceTimeout = setTimeout(async () => {
    if (lastRequest) {
      const { req: lastReq, res: lastRes } = lastRequest;
      lastRequest = null;
      await checkout_pickup_availability_check(lastReq, lastRes);
    }
  }, 5000); // 5 seconds debounce time
};

router.get(
  "/checkout/pickup/availability/check",
  debounceMiddleware,
  async (req, res) => {
    if (lastRequest && lastRequest.req === req) {
      await checkout_pickup_availability_check(req, res);
    } else {
      res.status(202).json({
        message:
          "Request received, processing will occur after debounce period.",
      });
    }
  }
);

router.post("/checkout/address/validation", checkout_address_validation);
export default router;
