import express from "express";
import { trabucco_products_import } from "./controllers/trabucco_products_import.controller";
import { trabucco_inventory_sync } from "./controllers/trabucco_inventory_sync.controller";
import { trabucco_catalog_variant_sync } from "./controllers/trabucco_catalog_variant_sync.controller";
import { trabucco_stock_metafields_sync } from "./controllers/trabucco_stock_metafields_sync.controller";
import { trabucco_packing_slip } from "./controllers/trabucco_packing_slip.controller";
import { trabucco_packing_slip_store } from "./controllers/trabucco_packing_slip_store.controller";

const router = express.Router();

router.get("/products/import", trabucco_products_import);
router.get("/products/inventory-sync", trabucco_inventory_sync);
router.get("/products/catalog-variant-sync", trabucco_catalog_variant_sync);
router.get("/products/stock-metafields-sync", trabucco_stock_metafields_sync);
router.get("/orders/packing-slip", trabucco_packing_slip);
router.post("/orders/packing-slip", trabucco_packing_slip);
router.post("/orders/packing-slip/store", trabucco_packing_slip_store);

export default router;
