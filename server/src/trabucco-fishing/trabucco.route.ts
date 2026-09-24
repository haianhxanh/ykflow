import express from "express";
import { trabucco_products_import } from "./controllers/trabucco_products_import.controller";
import { trabucco_inventory_sync } from "./controllers/trabucco_inventory_sync.controller";
import { trabucco_catalog_variant_sync } from "./controllers/trabucco_catalog_variant_sync.controller";
import { trabucco_stock_metafields_sync } from "./controllers/trabucco_stock_metafields_sync.controller";
import { trabucco_delivery_note } from "./controllers/trabucco_delivery_note.controller";

const router = express.Router();

router.get("/products/import", trabucco_products_import);
router.get("/products/inventory-sync", trabucco_inventory_sync);
router.get("/products/catalog-variant-sync", trabucco_catalog_variant_sync);
router.get("/products/stock-metafields-sync", trabucco_stock_metafields_sync);
router.get("/orders/delivery-note", trabucco_delivery_note);
router.post("/orders/delivery-note", trabucco_delivery_note);

export default router;
