import express from "express";
import { yesmeExportAuth, yesmeStorefrontAuth } from "./yesme.auth";
import { yesme_draft_order_create } from "./controllers/yesme_draft_order_create.controller";
import { yesme_orders_export } from "./controllers/yesme_orders_export.controller";
import { yesme_packing_lists } from "./controllers/yesme_packing_lists.controller";

const router = express.Router();

router.post("/draft-order/create", yesmeStorefrontAuth, yesme_draft_order_create);
router.get("/orders/export", yesmeExportAuth, yesme_orders_export);
router.get("/orders/packing-lists", yesmeExportAuth, yesme_packing_lists);

export default router;
