"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.trabucco_products_import = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const graphql_request_1 = require("graphql-request");
const xml_js_1 = __importDefault(require("xml-js"));
const locations_1 = require("../../queries/locations");
dotenv_1.default.config();
const { TRABUCCO_STORE, TRABUCCO_ACCESS_TOKEN, API_VERSION } = process.env;
// Shoptet warehouse names (productsComplete.xml) -> Shopify location names.
// TODO: confirm final Shopify location names once both locations are created, then update this map.
const WAREHOUSE_TO_LOCATION = {
    "Průmyslová": "Průmyslová",
    "Externí sklad": "External location",
};
/*-------------------------------------MAIN FUNCTION------------------------------------------------*/
// Fetch products from Trabucco's Shoptet XML feed (productsComplete.xml)
// Map SHOPITEM -> product, nested VARIANTS/VARIANT (with PARAMETERS) -> Shopify variants
// TODO: product creation loop (see ../../controllers/brainmarkets_products_import.controller.ts for the
//   reference shape: productsQuery to check for existing product by title, productCreateQuery as DRAFT,
//   productOptionsCreateQuery + productVariantsBulkCreateQuery per variant, inventoryBulkToggleActivation
//   to activate at both locations, inventorySetQuantities from stockByWarehouse via WAREHOUSE_TO_LOCATION)
// Still to decide: product status on import, tags, category -> collection mapping, whether the
// wholesale PRICELIST block matters for Shopify, and how to dedupe/re-run imports safely.
/*-------------------------------------MAIN FUNCTION------------------------------------------------*/
const trabucco_products_import = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const xmlUrl = req.query.xmlUrl;
        const client = new graphql_request_1.GraphQLClient(`https://${TRABUCCO_STORE}/admin/api/${API_VERSION}/graphql.json`, {
            // @ts-ignore
            headers: {
                "X-Shopify-Access-Token": TRABUCCO_ACCESS_TOKEN,
            },
        });
        const items = yield fetchProductsFromXml(xmlUrl);
        const mappedItems = mapItems(items);
        const locations = yield client.request(locations_1.locationsQuery);
        const locationIds = locations.locations.edges.map((location) => location.node.id);
        // TODO: create products/variants here (see reference controller above)
        return res.status(200).json({ itemsFound: mappedItems.length, locationsFound: locationIds.length });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal server error" });
    }
});
exports.trabucco_products_import = trabucco_products_import;
const fetchProductsFromXml = (xmlUrl) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const response = yield fetch(xmlUrl, {
        method: "GET",
        headers: {
            "Content-Type": "text/xml",
        },
    })
        .then(function (response) {
        return response.text();
    })
        .then(function (xml) {
        var json_result = xml_js_1.default.xml2js(xml, { compact: true });
        return json_result;
    });
    return (_a = response === null || response === void 0 ? void 0 : response.SHOP) === null || _a === void 0 ? void 0 : _a.SHOPITEM;
});
const asArray = (value) => (Array.isArray(value) ? value : [value].filter(Boolean));
const mapWarehouseStock = (stock) => {
    var _a;
    const warehouses = asArray((_a = stock === null || stock === void 0 ? void 0 : stock.WAREHOUSES) === null || _a === void 0 ? void 0 : _a.WAREHOUSE);
    return warehouses.reduce((acc, warehouse) => {
        var _a, _b;
        var _c;
        const name = (_a = warehouse === null || warehouse === void 0 ? void 0 : warehouse.NAME) === null || _a === void 0 ? void 0 : _a._text;
        const value = Number((_c = (_b = warehouse === null || warehouse === void 0 ? void 0 : warehouse.VALUE) === null || _b === void 0 ? void 0 : _b._text) !== null && _c !== void 0 ? _c : 0);
        if (name)
            acc[name] = value;
        return acc;
    }, {});
};
const mapVariant = (parentTitle, variantSource) => {
    var _a, _b, _c, _d, _e, _f;
    const parameters = asArray((_a = variantSource === null || variantSource === void 0 ? void 0 : variantSource.PARAMETERS) === null || _a === void 0 ? void 0 : _a.PARAMETER);
    const [optionParam] = parameters;
    return {
        productTitle: parentTitle,
        sku: (_b = variantSource === null || variantSource === void 0 ? void 0 : variantSource.CODE) === null || _b === void 0 ? void 0 : _b._text,
        ean: (_c = variantSource === null || variantSource === void 0 ? void 0 : variantSource.EAN) === null || _c === void 0 ? void 0 : _c._text,
        price: (_d = variantSource === null || variantSource === void 0 ? void 0 : variantSource.PRICE_VAT) === null || _d === void 0 ? void 0 : _d._text,
        stockByWarehouse: mapWarehouseStock(variantSource === null || variantSource === void 0 ? void 0 : variantSource.STOCK),
        optionName: (_e = optionParam === null || optionParam === void 0 ? void 0 : optionParam.NAME) === null || _e === void 0 ? void 0 : _e._text,
        optionValue: (_f = optionParam === null || optionParam === void 0 ? void 0 : optionParam.VALUE) === null || _f === void 0 ? void 0 : _f._text,
    };
};
const mapItems = (items) => {
    return items.map((item) => {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
        const images = asArray((_a = item.IMAGES) === null || _a === void 0 ? void 0 : _a.IMAGE);
        const variantSources = ((_b = item.VARIANTS) === null || _b === void 0 ? void 0 : _b.VARIANT) ? asArray(item.VARIANTS.VARIANT) : [item];
        return {
            title: (_c = item.NAME) === null || _c === void 0 ? void 0 : _c._text,
            guid: (_d = item.GUID) === null || _d === void 0 ? void 0 : _d._text,
            manufacturer: (_e = item.MANUFACTURER) === null || _e === void 0 ? void 0 : _e._text,
            category: (_g = (_f = item.CATEGORIES) === null || _f === void 0 ? void 0 : _f.DEFAULT_CATEGORY) === null || _g === void 0 ? void 0 : _g._text,
            // DESCRIPTION/SHORT_DESCRIPTION are CDATA-wrapped, so xml-js puts them under _cdata, not _text.
            // Present on ~2,381/4,920 products — the rest have neither, so a fallback will be needed on import.
            descriptionHtml: (_h = item.DESCRIPTION) === null || _h === void 0 ? void 0 : _h._cdata,
            shortDescription: (_j = item.SHORT_DESCRIPTION) === null || _j === void 0 ? void 0 : _j._cdata,
            images: images.map((image) => image._text).filter(Boolean),
            variants: variantSources.map((variant) => { var _a; return mapVariant((_a = item.NAME) === null || _a === void 0 ? void 0 : _a._text, variant); }),
        };
    });
};
