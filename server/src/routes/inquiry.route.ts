import express from "express";
import { get_inquiries } from "../controllers/get_inquiry.controller";
import { receive_inquiry } from "../controllers/receive_inquiry.controller";
import { auth } from "../authorization/authorization";
import { update_inquiry } from "../controllers/update_inquiry.controller";
import { get_order_inquiries } from "../controllers/get_order_inquiries.controller";

const router = express.Router();

router.get("/inquiries", auth, get_inquiries);
router.post("/inquiry/new", receive_inquiry);
router.put("/inquiry/update", auth, update_inquiry);
router.get("/order-inquiries?:order_id", get_order_inquiries);

export default router;
