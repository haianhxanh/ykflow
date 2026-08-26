import express from "express";
import { yesmeStorefrontAuth } from "./yesme.auth";
import { yesme_draft_order_create } from "./controllers/yesme_draft_order_create.controller";

const router = express.Router();

router.post("/draft-order/create", yesmeStorefrontAuth, yesme_draft_order_create);

export default router;
