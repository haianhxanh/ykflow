"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const trabucco_products_import_controller_1 = require("./controllers/trabucco_products_import.controller");
const trabucco_inventory_sync_controller_1 = require("./controllers/trabucco_inventory_sync.controller");
const router = express_1.default.Router();
router.get("/products/import", trabucco_products_import_controller_1.trabucco_products_import);
router.get("/products/inventory-sync", trabucco_inventory_sync_controller_1.trabucco_inventory_sync);
exports.default = router;
