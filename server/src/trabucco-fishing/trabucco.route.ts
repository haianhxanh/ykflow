import express from "express";
import { trabucco_products_import } from "./controllers/trabucco_products_import.controller";
import { trabucco_inventory_sync } from "./controllers/trabucco_inventory_sync.controller";

const router = express.Router();

router.get("/products/import", trabucco_products_import);
router.get("/products/inventory-sync", trabucco_inventory_sync);

export default router;
