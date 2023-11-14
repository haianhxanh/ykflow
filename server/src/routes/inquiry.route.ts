import express from "express";
import { get_inquiries } from "../controllers/get_inquiry.controller";
import { receive_inquiries } from "../controllers/receive_inquiry.controller";
import { auth } from "../authorization/authorization";
import { update_inquiries } from "../controllers/update_inquiry.controller";

const router = express.Router();

router.get("/inquiries", auth, get_inquiries);
router.post("/inquiries/new", receive_inquiries);
router.put("/inquiries/update", auth, update_inquiries);

export default router;
