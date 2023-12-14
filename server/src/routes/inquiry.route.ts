import express from "express";
import { get_inquiries } from "../controllers/get_inquiry.controller";
import { receive_inquiry } from "../controllers/receive_inquiry.controller";
import { auth } from "../authorization/authorization";
import { update_inquiry } from "../controllers/update_inquiry.controller";

const router = express.Router();

router.get("/inquiries", auth, get_inquiries);
router.post("/inquiry/new", receive_inquiry);
router.put("/inquiry/update", auth, update_inquiry);

export default router;
