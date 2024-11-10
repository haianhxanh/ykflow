import express from "express";
import { get_inquiries } from "../controllers/get_inquiry.controller";
import { receive_inquiry } from "../controllers/receive_inquiry.controller";
import { auth } from "../authorization/authorization";
import { update_inquiry } from "../controllers/update_inquiry.controller";
import { get_order_inquiries } from "../controllers/get_order_inquiries.controller";
import { delete_inquiry } from "../controllers/delete_inquiry.controller";
import { fulfill } from "../controllers/fulfill_order.controller";
import { orders_export } from "../controllers/orders_export.controller";

const router = express.Router();

router.get("/inquiries", auth, get_inquiries);
router.post("/inquiry/new", receive_inquiry);
router.put("/inquiry/update", auth, update_inquiry);
router.post("/inquiry/delete", auth, delete_inquiry);
router.get("/order-inquiries?:order_id", get_order_inquiries);
router.get("/fulfill", fulfill);
router.get("/orders/export", orders_export);

export default router;
