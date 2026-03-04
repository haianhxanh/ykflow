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
exports.orders_export = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const graphql_request_1 = require("graphql-request");
const orders_1 = require("../queries/orders");
const exceljs_1 = __importDefault(require("exceljs"));
const constants_1 = require("../utils/constants");
const notification_1 = require("../utils/notification");
const helpers_1 = require("../utils/helpers");
const orderExportHelper_1 = require("../utils/orderExportHelper");
const locations_1 = require("../queries/locations");
dotenv_1.default.config();
const { ACCESS_TOKEN, STORE, API_VERSION, ORDER_EXPORT_RECIPIENTS, MANDRILL_MESSAGE_BCC_ADDRESS_DEV } = process.env;
const recipientEmails = ORDER_EXPORT_RECIPIENTS;
const programRelatedTags = ["Programy", "Monoporce", "Ecobox"];
/*-------------------------------------MAIN FUNCTION------------------------------------------------*/
const orders_export = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7, _8, _9, _10, _11, _12, _13, _14, _15, _16, _17, _18, _19, _20, _21, _22, _23, _24, _25, _26, _27, _28, _29, _30, _31, _32, _33, _34, _35, _36, _37, _38, _39, _40, _41, _42, _43, _44, _45, _46, _47, _48, _49, _50, _51, _52, _53, _54, _55, _56, _57, _58, _59, _60, _61, _62, _63, _64, _65, _66, _67, _68, _69, _70, _71, _72, _73, _74, _75, _76, _77, _78, _79, _80, _81, _82, _83, _84, _85, _86, _87, _88, _89, _90, _91, _92, _93, _94, _95, _96, _97, _98, _99, _100, _101;
    try {
        const client = new graphql_request_1.GraphQLClient(`https://${STORE}/admin/api/${API_VERSION}/graphql.json`, {
            // @ts-ignore
            headers: {
                "X-Shopify-Access-Token": ACCESS_TOKEN,
            },
        });
        const yesterday = req.query.date ? req.query.date : getYesterday();
        const latestOrders = yield client.request(orders_1.ordersQuery, {
            query: `(created_at:'${yesterday}')`,
        });
        const workbook = new exceljs_1.default.Workbook();
        const worksheet = workbook.addWorksheet(`Objednávky ${yesterday}`);
        const disallowedFinancialStatuses = ["VOIDED", "EXPIRED", "REFUNDED"];
        // const allowedPaymentMethods = ["Platba na fakturu", "shopify_payments", "paypal"];
        const filteredOrders = latestOrders.orders.edges.filter((order) => {
            var _a;
            return !disallowedFinancialStatuses.includes((_a = order.node) === null || _a === void 0 ? void 0 : _a.displayFinancialStatus);
        });
        for (const [orderIndex, order] of filteredOrders.entries()) {
            if (orderIndex === 0) {
                let header = [
                    { header: "Order name", key: "orderName", width: 10 },
                    { header: "Financial Status", key: "financialStatus", width: 10 },
                    { header: "Billing Name", key: "billingName", width: 20 },
                    { header: "Shipping Name", key: "shippingName", width: 20 },
                    { header: "Shipping Company", key: "shippingCompany", width: 20 },
                    { header: "Shipping Phone", key: "shippingPhone", width: 15 },
                    { header: "Shipping Street", key: "shippingStreet", width: 15 },
                    { header: "Shipping City", key: "shippingCity", width: 15 },
                    { header: "Shipping Zip", key: "shippingZip", width: 10 },
                    { header: "Full Address", key: "fullAddress", width: 20 },
                    { header: "Delivery Note", key: "shippingInstructions", width: 40 },
                    { header: "Note", key: "note", width: 15 },
                    { header: "Note Attributes", key: "noteAttributes", width: 15 },
                    { header: "Doplňkový prodej", key: "addon", width: 15 },
                    { header: "Promo", key: "promo", width: 15 },
                    { header: "Start Date", key: "startDate", width: 15 },
                    { header: "End Date", key: "endDate", width: 15 },
                    { header: "Line Item Name", key: "lineItemName", width: 30 },
                    { header: "Single Portions", key: "singlePortions", width: 15 },
                    { header: "Program Length", key: "programLength", width: 10 },
                    { header: "Kcal", key: "kcal", width: 10 },
                    { header: "Krabičky", key: "ecobox", width: 15 },
                    { header: "Prudký alergik", key: "severeAllergic", width: 10 },
                ];
                constants_1.ALLERGENS.split(",").forEach((allergen) => {
                    header.push({ header: allergen, key: allergen, width: 10 });
                });
                worksheet.columns = header;
            }
            const oneTypeOrder = order.node.lineItems.edges.every((line) => {
                var _a, _b;
                return (_b = (_a = line.node.variant.product) === null || _a === void 0 ? void 0 : _a.tags) === null || _b === void 0 ? void 0 : _b.includes("Programy");
            }) ||
                order.node.lineItems.edges.every((line) => {
                    var _a, _b;
                    return !((_b = (_a = line.node.variant.product) === null || _a === void 0 ? void 0 : _a.tags) === null || _b === void 0 ? void 0 : _b.includes("Programy"));
                }) ||
                false;
            const mixedOrder = oneTypeOrder ? false : true;
            const programsItems = order.node.lineItems.edges.filter((line) => {
                var _a, _b;
                return (_b = (_a = line.node.variant.product) === null || _a === void 0 ? void 0 : _a.tags) === null || _b === void 0 ? void 0 : _b.includes("Programy");
            });
            const nonProgramItems = order.node.lineItems.edges.filter((line) => {
                var _a, _b;
                return !((_b = (_a = line.node.variant.product) === null || _a === void 0 ? void 0 : _a.tags) === null || _b === void 0 ? void 0 : _b.some((tag) => programRelatedTags.includes(tag)));
            });
            let mainItems = [];
            let nonProgramOrder = false;
            if (oneTypeOrder) {
                if (programsItems.length > 0) {
                    mainItems = programsItems;
                }
                else if (nonProgramItems.length > 0) {
                    mainItems = nonProgramItems;
                    nonProgramOrder = true;
                }
            }
            else {
                mainItems = programsItems;
            }
            let secondaryItems = order.node.lineItems.edges.filter((line) => {
                return !mainItems.includes(line);
            });
            let addons = [];
            let promo = [];
            const singlePortions = order.node.lineItems.edges.filter((line) => {
                var _a, _b;
                return (_b = (_a = line.node.variant.product) === null || _a === void 0 ? void 0 : _a.tags) === null || _b === void 0 ? void 0 : _b.includes("Monoporce");
            });
            const ecobox = order.node.lineItems.edges.filter((line) => {
                var _a, _b;
                return (_b = (_a = line.node.variant.product) === null || _a === void 0 ? void 0 : _a.tags) === null || _b === void 0 ? void 0 : _b.includes("Ecobox");
            });
            if (mixedOrder) {
                for (const [lineIndex, line] of secondaryItems.entries()) {
                    if (((_b = (_a = line.node.variant.product) === null || _a === void 0 ? void 0 : _a.tags) === null || _b === void 0 ? void 0 : _b.includes("excluded-from-export")) || ((_d = (_c = line.node.variant.product) === null || _c === void 0 ? void 0 : _c.tags) === null || _d === void 0 ? void 0 : _d.includes("Monoporce"))) {
                        continue;
                    }
                    if (line.node.originalTotalSet.shopMoney.amount - line.node.totalDiscountSet.shopMoney.amount > 0) {
                        addons.push(line);
                    }
                    else {
                        promo.push(line);
                    }
                }
            }
            let shippingAddress;
            if (((_f = (_e = order.node) === null || _e === void 0 ? void 0 : _e.shippingAddress) === null || _f === void 0 ? void 0 : _f.address1) && !((_h = (_g = order.node) === null || _g === void 0 ? void 0 : _g.shippingAddress) === null || _h === void 0 ? void 0 : _h.address2)) {
                shippingAddress = (_k = (_j = order.node) === null || _j === void 0 ? void 0 : _j.shippingAddress) === null || _k === void 0 ? void 0 : _k.address1;
            }
            else if (((_m = (_l = order.node) === null || _l === void 0 ? void 0 : _l.shippingAddress) === null || _m === void 0 ? void 0 : _m.address1) && ((_p = (_o = order.node) === null || _o === void 0 ? void 0 : _o.shippingAddress) === null || _p === void 0 ? void 0 : _p.address2)) {
                shippingAddress = `${(_r = (_q = order.node) === null || _q === void 0 ? void 0 : _q.shippingAddress) === null || _r === void 0 ? void 0 : _r.address1} ${(_t = (_s = order.node) === null || _s === void 0 ? void 0 : _s.shippingAddress) === null || _t === void 0 ? void 0 : _t.address2}`;
            }
            const fullAddressArray = [];
            if ((_v = (_u = order.node) === null || _u === void 0 ? void 0 : _u.shippingAddress) === null || _v === void 0 ? void 0 : _v.address1) {
                fullAddressArray.push((_x = (_w = order.node) === null || _w === void 0 ? void 0 : _w.shippingAddress) === null || _x === void 0 ? void 0 : _x.address1);
            }
            if ((_z = (_y = order.node) === null || _y === void 0 ? void 0 : _y.shippingAddress) === null || _z === void 0 ? void 0 : _z.address2) {
                fullAddressArray.push((_1 = (_0 = order.node) === null || _0 === void 0 ? void 0 : _0.shippingAddress) === null || _1 === void 0 ? void 0 : _1.address2);
            }
            if ((_3 = (_2 = order.node) === null || _2 === void 0 ? void 0 : _2.shippingAddress) === null || _3 === void 0 ? void 0 : _3.city) {
                fullAddressArray.push((_5 = (_4 = order.node) === null || _4 === void 0 ? void 0 : _4.shippingAddress) === null || _5 === void 0 ? void 0 : _5.city);
            }
            if ((_7 = (_6 = order.node) === null || _6 === void 0 ? void 0 : _6.shippingAddress) === null || _7 === void 0 ? void 0 : _7.zip) {
                fullAddressArray.push((_10 = (_9 = (_8 = order.node) === null || _8 === void 0 ? void 0 : _8.shippingAddress) === null || _9 === void 0 ? void 0 : _9.zip) === null || _10 === void 0 ? void 0 : _10.replace(/\s/g, ""));
            }
            const location = yield client.request(locations_1.locationQueryByName, {
                query: `name:${(_12 = (_11 = order.node) === null || _11 === void 0 ? void 0 : _11.shippingLine) === null || _12 === void 0 ? void 0 : _12.title}`,
            });
            const pickupLocationAddress = ((_15 = (_14 = (_13 = location === null || location === void 0 ? void 0 : location.locations) === null || _13 === void 0 ? void 0 : _13.edges[0]) === null || _14 === void 0 ? void 0 : _14.node) === null || _15 === void 0 ? void 0 : _15.address)
                ? `Pickup ${(_17 = (_16 = order.node) === null || _16 === void 0 ? void 0 : _16.shippingLine) === null || _17 === void 0 ? void 0 : _17.title}, ${(_21 = (_20 = (_19 = (_18 = location === null || location === void 0 ? void 0 : location.locations) === null || _18 === void 0 ? void 0 : _18.edges[0]) === null || _19 === void 0 ? void 0 : _19.node) === null || _20 === void 0 ? void 0 : _20.address) === null || _21 === void 0 ? void 0 : _21.address1}, ${(_25 = (_24 = (_23 = (_22 = location === null || location === void 0 ? void 0 : location.locations) === null || _22 === void 0 ? void 0 : _22.edges[0]) === null || _23 === void 0 ? void 0 : _23.node) === null || _24 === void 0 ? void 0 : _24.address) === null || _25 === void 0 ? void 0 : _25.city}, ${(_29 = (_28 = (_27 = (_26 = location === null || location === void 0 ? void 0 : location.locations) === null || _26 === void 0 ? void 0 : _26.edges[0]) === null || _27 === void 0 ? void 0 : _27.node) === null || _28 === void 0 ? void 0 : _28.address) === null || _29 === void 0 ? void 0 : _29.zip}`
                : "";
            let fullAddress = fullAddressArray.join(", ");
            if (!shippingAddress) {
                fullAddress = pickupLocationAddress;
            }
            const shippingInstructions = (0, orderExportHelper_1.getShippingInstructions)(order);
            for (const [lineIndex, line] of mainItems.entries()) {
                let programStartDate, programEndDate, programLength;
                const lineIsProgram = (_33 = (_32 = (_31 = (_30 = line === null || line === void 0 ? void 0 : line.node) === null || _30 === void 0 ? void 0 : _30.variant) === null || _31 === void 0 ? void 0 : _31.product) === null || _32 === void 0 ? void 0 : _32.tags) === null || _33 === void 0 ? void 0 : _33.includes("Programy");
                const lineSku = (_35 = (_34 = line === null || line === void 0 ? void 0 : line.node) === null || _34 === void 0 ? void 0 : _34.variant) === null || _35 === void 0 ? void 0 : _35.sku;
                const lineQuantity = nonProgramOrder ? 1 : line.node.quantity;
                let promoField, addonsField;
                const severeAllergicAttr = ((_38 = (_37 = (_36 = line === null || line === void 0 ? void 0 : line.node) === null || _36 === void 0 ? void 0 : _36.customAttributes) === null || _37 === void 0 ? void 0 : _37.find((attr) => attr.key.includes("severe allergy") || attr.key.includes("alergik"))) === null || _38 === void 0 ? void 0 : _38.value) ||
                    ((_41 = (_40 = (_39 = order.node) === null || _39 === void 0 ? void 0 : _39.customAttributes) === null || _40 === void 0 ? void 0 : _40.find((attr) => attr.key.includes(`Alergik_${lineSku}`))) === null || _41 === void 0 ? void 0 : _41.value);
                const severeAllergic = severeAllergicAttr == "Yes" || severeAllergicAttr == "Ano" ? true : false;
                if (lineIsProgram) {
                    programLength = (_44 = (_43 = (_42 = line.node) === null || _42 === void 0 ? void 0 : _42.variant) === null || _43 === void 0 ? void 0 : _43.sku) === null || _44 === void 0 ? void 0 : _44.split("D")[0];
                    programLength = (0, helpers_1.setProgramLengthWord)(parseInt(programLength));
                }
                for (let i = 0; i < lineQuantity; i++) {
                    if (lineIsProgram && order.node.customAttributes) {
                        for (const attribute of order.node.customAttributes) {
                            if (attribute.key === "Datum začátku Yes Krabiček") {
                                programStartDate = attribute.value;
                            }
                            if (attribute.key === `Konec_${(_47 = (_46 = (_45 = line.node) === null || _45 === void 0 ? void 0 : _45.variant) === null || _46 === void 0 ? void 0 : _46.id) === null || _47 === void 0 ? void 0 : _47.replace("gid://shopify/ProductVariant/", "")}`) {
                                programEndDate = attribute.value;
                                // change program end date of AKCE items to be after the main program
                                if (line.node.customAttributes.find((attr) => attr.key == "AKCE")) {
                                    // add note about AKCE to the main program
                                    if (programLength && !programLength.includes("AKCE zdarma")) {
                                        programLength += `| AKCE zdarma, navazuje na hlavní program`;
                                    }
                                    console.log(order.node.id, line.node.title);
                                    // find the main program
                                    const mainProgram = order.node.lineItems.edges.find((mainLine) => {
                                        return line.node.title === mainLine.node.title && !mainLine.node.customAttributes.find((attr) => attr.key == "AKCE");
                                    });
                                    const mainProgramEndDate = order.node.customAttributes.find((attr) => {
                                        var _a, _b, _c;
                                        return attr.key === `Konec_${(_c = (_b = (_a = mainProgram === null || mainProgram === void 0 ? void 0 : mainProgram.node) === null || _a === void 0 ? void 0 : _a.variant) === null || _b === void 0 ? void 0 : _b.id) === null || _c === void 0 ? void 0 : _c.replace("gid://shopify/ProductVariant/", "")}`;
                                    });
                                    programStartDate = (0, helpers_1.getFutureBusinessDate)((0, helpers_1.convertDateToISOString)(mainProgramEndDate.value), 1);
                                    programEndDate = (0, helpers_1.convertDateToLocalString)((0, helpers_1.getFutureBusinessDate)(programStartDate, 4)).replace(/\./g, "-");
                                    programStartDate = (0, helpers_1.convertDateToLocalString)(programStartDate).replace(/\./g, "-");
                                }
                            }
                        }
                    }
                    const customAttributes = (_49 = (_48 = order.node) === null || _48 === void 0 ? void 0 : _48.customAttributes) === null || _49 === void 0 ? void 0 : _49.map((attr) => {
                        return `${attr.key}: ${attr.value}`;
                    });
                    if (lineIndex == 0 && mixedOrder) {
                        if (promo.length > 0)
                            promoField = promo
                                .map((item) => {
                                const variantTitle = item.node.variant.title == "Default Title" ? "" : ` (${item.node.variant.title})`;
                                return `${item.node.quantity} x ${item.node.title} ${variantTitle}`;
                            })
                                .join("\n");
                        if (addons.length > 0)
                            addonsField = addons
                                .map((item) => {
                                const variantTitle = item.node.variant.title == "Default Title" ? "" : ` (${item.node.variant.title})`;
                                return `${item.node.quantity} x ${item.node.title} ${variantTitle}`;
                            })
                                .join("\n");
                    }
                    const variantTitle = line.node.variant.title == "Default Title" ? "" : ` (${line.node.variant.title})`;
                    const lineItemName = lineIsProgram ? line.node.title : line.node.quantity + " x " + line.node.title + variantTitle;
                    // check if line has associated single portions
                    const lineProgramId = lineIsProgram ? (_50 = line.node.customAttributes.find((attr) => attr.key == "_program_id")) === null || _50 === void 0 ? void 0 : _50.value : null;
                    const programSinglePortions = singlePortions.filter((item) => { var _a; return ((_a = item.node.customAttributes.find((attr) => attr.key == "_program_id")) === null || _a === void 0 ? void 0 : _a.value) == lineProgramId; });
                    const programEcobox = ecobox.filter((item) => { var _a; return ((_a = item.node.customAttributes.find((attr) => attr.key == "_program_id")) === null || _a === void 0 ? void 0 : _a.value) == lineProgramId; });
                    const singlePortionsCol = programSinglePortions.length > 0
                        ? programSinglePortions
                            .map((item) => {
                            const variantTitle = item.node.variant.title == "Default Title" ? "" : ` (${item.node.variant.title})`;
                            return `${item.node.quantity} x ${item.node.title} ${variantTitle}`;
                        })
                            .join("\n")
                        : "";
                    const ecoboxCol = programEcobox.length > 0 ? "EKO" : "";
                    const row = [
                        (_51 = order.node) === null || _51 === void 0 ? void 0 : _51.name,
                        (_52 = order.node) === null || _52 === void 0 ? void 0 : _52.displayFinancialStatus,
                        (_54 = (_53 = order.node) === null || _53 === void 0 ? void 0 : _53.billingAddress) === null || _54 === void 0 ? void 0 : _54.name,
                        ((_56 = (_55 = order.node) === null || _55 === void 0 ? void 0 : _55.shippingAddress) === null || _56 === void 0 ? void 0 : _56.name) || "",
                        ((_58 = (_57 = order.node) === null || _57 === void 0 ? void 0 : _57.shippingAddress) === null || _58 === void 0 ? void 0 : _58.company) || "",
                        ((_60 = (_59 = order.node) === null || _59 === void 0 ? void 0 : _59.shippingAddress) === null || _60 === void 0 ? void 0 : _60.phone) || ((_62 = (_61 = order.node) === null || _61 === void 0 ? void 0 : _61.billingAddress) === null || _62 === void 0 ? void 0 : _62.phone) || "",
                        shippingAddress || `${((_64 = (_63 = order.node) === null || _63 === void 0 ? void 0 : _63.shippingLine) === null || _64 === void 0 ? void 0 : _64.title) ? `Pickup ${(_66 = (_65 = order.node) === null || _65 === void 0 ? void 0 : _65.shippingLine) === null || _66 === void 0 ? void 0 : _66.title}` : ""}` || "",
                        ((_68 = (_67 = order.node) === null || _67 === void 0 ? void 0 : _67.shippingAddress) === null || _68 === void 0 ? void 0 : _68.city) || "",
                        ((_71 = (_70 = (_69 = order.node) === null || _69 === void 0 ? void 0 : _69.shippingAddress) === null || _70 === void 0 ? void 0 : _70.zip) === null || _71 === void 0 ? void 0 : _71.replace(/\s/g, "")) || "",
                        fullAddress,
                        shippingInstructions,
                        (_72 = order.node) === null || _72 === void 0 ? void 0 : _72.note,
                        customAttributes === null || customAttributes === void 0 ? void 0 : customAttributes.join("\n"),
                        i == 0 ? (addonsField ? addonsField : "") : "", // if line has qty > 1, add addons to the first item
                        promoField ? promoField : "",
                        programStartDate,
                        programEndDate,
                        lineItemName,
                        singlePortionsCol,
                        programLength ? programLength : "",
                        lineIsProgram ? (_75 = (_74 = (_73 = line.node) === null || _73 === void 0 ? void 0 : _73.title) === null || _74 === void 0 ? void 0 : _74.split(" | ")[1]) === null || _75 === void 0 ? void 0 : _75.replace(" kcal", "") : "",
                        ecoboxCol,
                        severeAllergic ? "Ano" : "",
                    ];
                    if (lineIsProgram) {
                        let allergens = (_77 = (_76 = line.node) === null || _76 === void 0 ? void 0 : _76.customAttributes) === null || _77 === void 0 ? void 0 : _77.find((attr) => (attr.key == "Vyřazeno" || attr.key == "Excluded" || attr.key == "Alergeny") && attr.value != "");
                        // AKCE zdarma
                        const isAKCE = line.node.customAttributes.find((attr) => attr.key == "AKCE");
                        const mainProgram = order.node.lineItems.edges.find((mainLine) => {
                            return line.node.title === mainLine.node.title && !mainLine.node.customAttributes.find((attr) => attr.key == "AKCE");
                        });
                        if (isAKCE && mainProgram) {
                            allergens = mainProgram.node.customAttributes.find((attr) => (attr.key == "Vyřazeno" || attr.key == "Excluded" || attr.key == "Alergeny") && attr.value != "");
                        }
                        // AKCE zdarma
                        if (order.node.customAttributes && order.node.sourceName == "shopify_draft_order") {
                            for (const attribute of order.node.customAttributes) {
                                if (attribute.key.includes("Vyřazeno") || attribute.key.includes("Excluded") || attribute.key.includes("Alergeny")) {
                                    const sku = line.node.variant.sku;
                                    if (attribute.key.includes(sku)) {
                                        allergens = attribute;
                                    }
                                }
                            }
                        }
                        if (allergens) {
                            allergens = allergens.value.split(",").map((allergen) => allergen.trim());
                            const firstRow = worksheet.getRow(1);
                            firstRow.eachCell((cell, colNumber) => {
                                if (colNumber > 21) {
                                    if (allergens.includes(cell.value)) {
                                        row.push(cell.value);
                                    }
                                    else {
                                        row.push("");
                                    }
                                }
                            });
                        }
                    }
                    worksheet.addRow(row);
                }
            }
            // Handle single portions not tied to any program
            const allProgramIds = mainItems
                .filter((line) => { var _a, _b, _c, _d; return (_d = (_c = (_b = (_a = line === null || line === void 0 ? void 0 : line.node) === null || _a === void 0 ? void 0 : _a.variant) === null || _b === void 0 ? void 0 : _b.product) === null || _c === void 0 ? void 0 : _c.tags) === null || _d === void 0 ? void 0 : _d.includes("Programy"); })
                .map((line) => { var _a; return (_a = line.node.customAttributes.find((attr) => attr.key === "_program_id")) === null || _a === void 0 ? void 0 : _a.value; })
                .filter(Boolean);
            const untiedSinglePortions = singlePortions.filter((item) => {
                var _a;
                const programId = (_a = item.node.customAttributes.find((attr) => attr.key === "_program_id")) === null || _a === void 0 ? void 0 : _a.value;
                return !programId || !allProgramIds.includes(programId);
            });
            for (const item of untiedSinglePortions) {
                const variantTitle = item.node.variant.title === "Default Title" ? "" : ` (${item.node.variant.title})`;
                const lineItemName = `${item.node.quantity} x ${item.node.title}${variantTitle}`;
                const customAttributes = (_79 = (_78 = order.node) === null || _78 === void 0 ? void 0 : _78.customAttributes) === null || _79 === void 0 ? void 0 : _79.map((attr) => `${attr.key}: ${attr.value}`);
                const row = [
                    (_80 = order.node) === null || _80 === void 0 ? void 0 : _80.name,
                    (_81 = order.node) === null || _81 === void 0 ? void 0 : _81.displayFinancialStatus,
                    (_83 = (_82 = order.node) === null || _82 === void 0 ? void 0 : _82.billingAddress) === null || _83 === void 0 ? void 0 : _83.name,
                    ((_85 = (_84 = order.node) === null || _84 === void 0 ? void 0 : _84.shippingAddress) === null || _85 === void 0 ? void 0 : _85.name) || "",
                    ((_87 = (_86 = order.node) === null || _86 === void 0 ? void 0 : _86.shippingAddress) === null || _87 === void 0 ? void 0 : _87.company) || "",
                    ((_89 = (_88 = order.node) === null || _88 === void 0 ? void 0 : _88.shippingAddress) === null || _89 === void 0 ? void 0 : _89.phone) || ((_91 = (_90 = order.node) === null || _90 === void 0 ? void 0 : _90.billingAddress) === null || _91 === void 0 ? void 0 : _91.phone) || "",
                    shippingAddress || `${((_93 = (_92 = order.node) === null || _92 === void 0 ? void 0 : _92.shippingLine) === null || _93 === void 0 ? void 0 : _93.title) ? `Pickup ${(_95 = (_94 = order.node) === null || _94 === void 0 ? void 0 : _94.shippingLine) === null || _95 === void 0 ? void 0 : _95.title}` : ""}` || "",
                    ((_97 = (_96 = order.node) === null || _96 === void 0 ? void 0 : _96.shippingAddress) === null || _97 === void 0 ? void 0 : _97.city) || "",
                    ((_100 = (_99 = (_98 = order.node) === null || _98 === void 0 ? void 0 : _98.shippingAddress) === null || _99 === void 0 ? void 0 : _99.zip) === null || _100 === void 0 ? void 0 : _100.replace(/\s/g, "")) || "",
                    fullAddress,
                    shippingInstructions,
                    (_101 = order.node) === null || _101 === void 0 ? void 0 : _101.note,
                    customAttributes === null || customAttributes === void 0 ? void 0 : customAttributes.join("\n"),
                    "", // addon
                    "", // promo
                    "", // startDate
                    "", // endDate
                    lineItemName,
                    "", // singlePortions
                    "", // programLength
                    "", // kcal
                    "", // ecobox
                    "", // severeAllergic
                ];
                worksheet.addRow(row);
            }
        }
        // return res.status(200).json(latestOrders);
        yield workbook.xlsx.writeFile(`orders-${yesterday}.xlsx`);
        const buffer = yield workbook.xlsx.writeBuffer();
        const base64Content = Buffer.from(buffer).toString("base64");
        const attachment = {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            name: `orders-${yesterday}.xlsx`,
            content: base64Content,
        };
        const shouldSendEmail = req.query.sendEmail !== "false";
        const isRevisedDoc = req.query.revised === "true";
        if (shouldSendEmail) {
            const sendEmail = yield (0, notification_1.sendNotification)(`Objednávky ${yesterday} ${isRevisedDoc ? "(opravný export)" : ""}`, recipientEmails, `Objednávky ze dne ${yesterday} jsou připraveny k exportu`, null, MANDRILL_MESSAGE_BCC_ADDRESS_DEV, attachment, true);
        }
        return res.status(200).json(attachment);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal server error" });
    }
});
exports.orders_export = orders_export;
const getYesterday = () => {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    return date.toISOString().split("T")[0];
};
