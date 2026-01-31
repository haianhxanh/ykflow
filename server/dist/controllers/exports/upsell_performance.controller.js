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
exports.upsell_performance = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const graphql_request_1 = require("graphql-request");
const orders_1 = require("../../queries/orders");
const upsell_details_1 = require("./upsell_details");
const exceljs_1 = __importDefault(require("exceljs"));
const variants_1 = require("../../queries/variants");
dotenv_1.default.config();
const { ACCESS_TOKEN, STORE, API_VERSION } = process.env;
/*-------------------------------------MAIN FUNCTION------------------------------------------------*/
const upsell_performance = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5;
    try {
        const client = new graphql_request_1.GraphQLClient(`https://${STORE}/admin/api/${API_VERSION}/graphql.json`, {
            // @ts-ignore
            headers: {
                "X-Shopify-Access-Token": ACCESS_TOKEN,
            },
        });
        const workbook = new exceljs_1.default.Workbook();
        const sheet = workbook.addWorksheet("Sheet1");
        const orders = yield (0, orders_1.allOrdersQuery)("created_at:>=2025-12-01 AND created_at:<=2025-12-31");
        const upgradedOrders = orders.filter((order) => {
            var _a, _b, _c;
            return (_c = (_b = (_a = order === null || order === void 0 ? void 0 : order.node) === null || _a === void 0 ? void 0 : _a.lineItems) === null || _b === void 0 ? void 0 : _b.edges) === null || _c === void 0 ? void 0 : _c.some((line) => {
                var _a, _b;
                return (_b = (_a = line === null || line === void 0 ? void 0 : line.node) === null || _a === void 0 ? void 0 : _a.customAttributes) === null || _b === void 0 ? void 0 : _b.some((attr) => attr.key == "_upgraded_program");
            });
        });
        console.log(upgradedOrders.length);
        for (const upgradedOrder of upgradedOrders) {
            const giftLineItems = (_c = (_b = (_a = upgradedOrder === null || upgradedOrder === void 0 ? void 0 : upgradedOrder.node) === null || _a === void 0 ? void 0 : _a.lineItems) === null || _b === void 0 ? void 0 : _b.edges) === null || _c === void 0 ? void 0 : _c.filter((line) => {
                var _a, _b;
                return (_b = (_a = line === null || line === void 0 ? void 0 : line.node) === null || _a === void 0 ? void 0 : _a.customAttributes) === null || _b === void 0 ? void 0 : _b.some((attr) => attr.key == "_upgraded_program_gift");
            });
            console.log("Order: ", (_d = upgradedOrder === null || upgradedOrder === void 0 ? void 0 : upgradedOrder.node) === null || _d === void 0 ? void 0 : _d.name);
            for (const giftLineItem of giftLineItems) {
                // get upgraded program
                const giftProgramId = (_g = (_f = (_e = giftLineItem === null || giftLineItem === void 0 ? void 0 : giftLineItem.node) === null || _e === void 0 ? void 0 : _e.customAttributes) === null || _f === void 0 ? void 0 : _f.find((attr) => attr.key == "_program_id")) === null || _g === void 0 ? void 0 : _g.value;
                // get upgraded program
                const upgradedProgram = (_k = (_j = (_h = upgradedOrder === null || upgradedOrder === void 0 ? void 0 : upgradedOrder.node) === null || _h === void 0 ? void 0 : _h.lineItems) === null || _j === void 0 ? void 0 : _j.edges) === null || _k === void 0 ? void 0 : _k.find((line) => {
                    var _a, _b, _c, _d, _e;
                    return ((_c = (_b = (_a = line === null || line === void 0 ? void 0 : line.node) === null || _a === void 0 ? void 0 : _a.customAttributes) === null || _b === void 0 ? void 0 : _b.find((attr) => attr.key == "_program_id")) === null || _c === void 0 ? void 0 : _c.value) == giftProgramId && ((_e = (_d = line === null || line === void 0 ? void 0 : line.node) === null || _d === void 0 ? void 0 : _d.customAttributes) === null || _e === void 0 ? void 0 : _e.find((attr) => attr.key == "_upgraded_program"));
                });
                const upgradedProgramPrice = parseFloat((_o = (_m = (_l = upgradedProgram === null || upgradedProgram === void 0 ? void 0 : upgradedProgram.node) === null || _l === void 0 ? void 0 : _l.discountedUnitPriceSet) === null || _m === void 0 ? void 0 : _m.shopMoney) === null || _o === void 0 ? void 0 : _o.amount) || 0;
                const giftVariant = yield client.request(variants_1.variantByIdQuery, { variantGid: (_q = (_p = giftLineItem === null || giftLineItem === void 0 ? void 0 : giftLineItem.node) === null || _p === void 0 ? void 0 : _p.variant) === null || _q === void 0 ? void 0 : _q.id });
                const upgradedLength = ((_t = (_s = (_r = upgradedProgram === null || upgradedProgram === void 0 ? void 0 : upgradedProgram.node) === null || _r === void 0 ? void 0 : _r.variant) === null || _s === void 0 ? void 0 : _s.sku) === null || _t === void 0 ? void 0 : _t.split("D")[0]) + "D";
                const programCalories = (_w = (_v = (_u = upgradedProgram === null || upgradedProgram === void 0 ? void 0 : upgradedProgram.node) === null || _u === void 0 ? void 0 : _u.variant) === null || _v === void 0 ? void 0 : _v.sku) === null || _w === void 0 ? void 0 : _w.split("D")[1];
                const upsell = upsell_details_1.upsellDetails.find((detail) => {
                    return detail.to == upgradedLength && giftLineItem.node.variant.id == detail.gift_variant_id;
                });
                const originalProgramSku = (upsell === null || upsell === void 0 ? void 0 : upsell.from) ? (upsell === null || upsell === void 0 ? void 0 : upsell.from) + programCalories : null;
                const originalProgram = originalProgramSku ? yield client.request(variants_1.variantsByQuery, { query: `sku:${originalProgramSku} AND status:ACTIVE AND tags:Programy`, first: 1 }) : null;
                const priceDifference = upgradedProgramPrice - ((_0 = (_z = (_y = (_x = originalProgram === null || originalProgram === void 0 ? void 0 : originalProgram.productVariants) === null || _x === void 0 ? void 0 : _x.edges[0]) === null || _y === void 0 ? void 0 : _y.node) === null || _z === void 0 ? void 0 : _z.metafield) === null || _0 === void 0 ? void 0 : _0.value);
                const row = [
                    (_1 = upgradedOrder === null || upgradedOrder === void 0 ? void 0 : upgradedOrder.node) === null || _1 === void 0 ? void 0 : _1.createdAt.split("T")[0],
                    (_2 = upgradedOrder === null || upgradedOrder === void 0 ? void 0 : upgradedOrder.node) === null || _2 === void 0 ? void 0 : _2.name,
                    (upsell === null || upsell === void 0 ? void 0 : upsell.from) ? (upsell === null || upsell === void 0 ? void 0 : upsell.from) + programCalories : "",
                    (upsell === null || upsell === void 0 ? void 0 : upsell.to) ? (upsell === null || upsell === void 0 ? void 0 : upsell.to) + programCalories : "",
                    priceDifference || "",
                    ((_4 = (_3 = giftVariant === null || giftVariant === void 0 ? void 0 : giftVariant.productVariant) === null || _3 === void 0 ? void 0 : _3.product) === null || _4 === void 0 ? void 0 : _4.title) + " - " + ((_5 = giftVariant === null || giftVariant === void 0 ? void 0 : giftVariant.productVariant) === null || _5 === void 0 ? void 0 : _5.title) || "",
                    (upsell === null || upsell === void 0 ? void 0 : upsell.gift_variant_price) || "",
                ];
                sheet.addRow(row);
                // save workbook
                yield workbook.xlsx.writeFile("upsell_performance_2025-12.xlsx");
            }
        }
        return res.status(200).json("OK");
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal server error" });
    }
});
exports.upsell_performance = upsell_performance;
