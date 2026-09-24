"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const trabucco_products_import_controller_1 = require("./controllers/trabucco_products_import.controller");
const trabucco_inventory_sync_controller_1 = require("./controllers/trabucco_inventory_sync.controller");
const trabucco_catalog_variant_sync_controller_1 = require("./controllers/trabucco_catalog_variant_sync.controller");
const trabucco_stock_metafields_sync_controller_1 = require("./controllers/trabucco_stock_metafields_sync.controller");
const trabucco_delivery_note_controller_1 = require("./controllers/trabucco_delivery_note.controller");
const router = express_1.default.Router();
router.get("/products/import", trabucco_products_import_controller_1.trabucco_products_import);
router.get("/products/inventory-sync", trabucco_inventory_sync_controller_1.trabucco_inventory_sync);
router.get("/products/catalog-variant-sync", trabucco_catalog_variant_sync_controller_1.trabucco_catalog_variant_sync);
router.get("/products/stock-metafields-sync", trabucco_stock_metafields_sync_controller_1.trabucco_stock_metafields_sync);
router.get("/orders/delivery-note", trabucco_delivery_note_controller_1.trabucco_delivery_note);
router.post("/orders/delivery-note", trabucco_delivery_note_controller_1.trabucco_delivery_note);
exports.default = router;
