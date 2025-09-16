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
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7, _8, _9, _10, _11, _12, _13, _14, _15, _16, _17, _18, _19, _20, _21, _22, _23, _24, _25, _26, _27, _28, _29, _30, _31, _32, _33, _34, _35, _36, _37, _38, _39, _40, _41, _42, _43, _44, _45, _46, _47, _48, _49, _50, _51, _52, _53, _54, _55, _56, _57, _58, _59, _60, _61, _62, _63, _64, _65, _66, _67, _68, _69, _70, _71, _72, _73, _74, _75, _76, _77;
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
            for (const [lineIndex, line] of mainItems.entries()) {
                let programStartDate, programEndDate, programLength;
                const lineIsProgram = (_h = (_g = (_f = (_e = line === null || line === void 0 ? void 0 : line.node) === null || _e === void 0 ? void 0 : _e.variant) === null || _f === void 0 ? void 0 : _f.product) === null || _g === void 0 ? void 0 : _g.tags) === null || _h === void 0 ? void 0 : _h.includes("Programy");
                const lineSku = (_k = (_j = line === null || line === void 0 ? void 0 : line.node) === null || _j === void 0 ? void 0 : _j.variant) === null || _k === void 0 ? void 0 : _k.sku;
                const lineQuantity = nonProgramOrder ? 1 : line.node.quantity;
                let promoField, addonsField;
                const severeAllergicAttr = ((_o = (_m = (_l = line === null || line === void 0 ? void 0 : line.node) === null || _l === void 0 ? void 0 : _l.customAttributes) === null || _m === void 0 ? void 0 : _m.find((attr) => attr.key.includes("severe allergy") || attr.key.includes("alergik"))) === null || _o === void 0 ? void 0 : _o.value) ||
                    ((_r = (_q = (_p = order.node) === null || _p === void 0 ? void 0 : _p.customAttributes) === null || _q === void 0 ? void 0 : _q.find((attr) => attr.key.includes(`Alergik_${lineSku}`))) === null || _r === void 0 ? void 0 : _r.value);
                const severeAllergic = severeAllergicAttr == "Yes" || severeAllergicAttr == "Ano" ? true : false;
                if (lineIsProgram) {
                    programLength = (_u = (_t = (_s = line.node) === null || _s === void 0 ? void 0 : _s.variant) === null || _t === void 0 ? void 0 : _t.sku) === null || _u === void 0 ? void 0 : _u.split("D")[0];
                    programLength = (0, helpers_1.setProgramLengthWord)(parseInt(programLength));
                }
                for (let i = 0; i < lineQuantity; i++) {
                    if (lineIsProgram && order.node.customAttributes) {
                        for (const attribute of order.node.customAttributes) {
                            if (attribute.key === "Datum začátku Yes Krabiček") {
                                programStartDate = attribute.value;
                            }
                            if (attribute.key === `Konec_${(_x = (_w = (_v = line.node) === null || _v === void 0 ? void 0 : _v.variant) === null || _w === void 0 ? void 0 : _w.id) === null || _x === void 0 ? void 0 : _x.replace("gid://shopify/ProductVariant/", "")}`) {
                                programEndDate = attribute.value;
                                // change program end date of AKCE items to be after the main program
                                continue;
                                if (line.node.customAttributes.find((attr) => attr.key == "AKCE")) {
                                    // add note about AKCE to the main program
                                    if (!programLength.includes("AKCE zdarma")) {
                                        programLength += `| AKCE zdarma, navazuje na hlavní program`;
                                    }
                                    console.log(order.node.id, line.node.title);
                                    // find the main program
                                    let mainProgram = order.node.lineItems.edges.find((mainLine) => {
                                        return line.node.title === mainLine.node.title && !mainLine.node.customAttributes.find((attr) => attr.key == "AKCE");
                                    });
                                    let mainProgramEndDate = order.node.customAttributes.find((attr) => {
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
                    const customAttributes = (_z = (_y = order.node) === null || _y === void 0 ? void 0 : _y.customAttributes) === null || _z === void 0 ? void 0 : _z.map((attr) => {
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
                    let shippingAddress;
                    if (((_1 = (_0 = order.node) === null || _0 === void 0 ? void 0 : _0.shippingAddress) === null || _1 === void 0 ? void 0 : _1.address1) && !((_3 = (_2 = order.node) === null || _2 === void 0 ? void 0 : _2.shippingAddress) === null || _3 === void 0 ? void 0 : _3.address2)) {
                        shippingAddress = (_5 = (_4 = order.node) === null || _4 === void 0 ? void 0 : _4.shippingAddress) === null || _5 === void 0 ? void 0 : _5.address1;
                    }
                    else if (((_7 = (_6 = order.node) === null || _6 === void 0 ? void 0 : _6.shippingAddress) === null || _7 === void 0 ? void 0 : _7.address1) && ((_9 = (_8 = order.node) === null || _8 === void 0 ? void 0 : _8.shippingAddress) === null || _9 === void 0 ? void 0 : _9.address2)) {
                        shippingAddress = `${(_11 = (_10 = order.node) === null || _10 === void 0 ? void 0 : _10.shippingAddress) === null || _11 === void 0 ? void 0 : _11.address1} ${(_13 = (_12 = order.node) === null || _12 === void 0 ? void 0 : _12.shippingAddress) === null || _13 === void 0 ? void 0 : _13.address2}`;
                    }
                    const fullAddressArray = [];
                    if ((_15 = (_14 = order.node) === null || _14 === void 0 ? void 0 : _14.shippingAddress) === null || _15 === void 0 ? void 0 : _15.address1) {
                        fullAddressArray.push((_17 = (_16 = order.node) === null || _16 === void 0 ? void 0 : _16.shippingAddress) === null || _17 === void 0 ? void 0 : _17.address1);
                    }
                    if ((_19 = (_18 = order.node) === null || _18 === void 0 ? void 0 : _18.shippingAddress) === null || _19 === void 0 ? void 0 : _19.address2) {
                        fullAddressArray.push((_21 = (_20 = order.node) === null || _20 === void 0 ? void 0 : _20.shippingAddress) === null || _21 === void 0 ? void 0 : _21.address2);
                    }
                    if ((_23 = (_22 = order.node) === null || _22 === void 0 ? void 0 : _22.shippingAddress) === null || _23 === void 0 ? void 0 : _23.city) {
                        fullAddressArray.push((_25 = (_24 = order.node) === null || _24 === void 0 ? void 0 : _24.shippingAddress) === null || _25 === void 0 ? void 0 : _25.city);
                    }
                    if ((_27 = (_26 = order.node) === null || _26 === void 0 ? void 0 : _26.shippingAddress) === null || _27 === void 0 ? void 0 : _27.zip) {
                        fullAddressArray.push((_30 = (_29 = (_28 = order.node) === null || _28 === void 0 ? void 0 : _28.shippingAddress) === null || _29 === void 0 ? void 0 : _29.zip) === null || _30 === void 0 ? void 0 : _30.replace(/\s/g, ""));
                    }
                    const location = yield client.request(locations_1.locationQueryByName, {
                        query: `name:${(_32 = (_31 = order.node) === null || _31 === void 0 ? void 0 : _31.shippingLine) === null || _32 === void 0 ? void 0 : _32.title}`,
                    });
                    const pickupLocationAddress = ((_35 = (_34 = (_33 = location === null || location === void 0 ? void 0 : location.locations) === null || _33 === void 0 ? void 0 : _33.edges[0]) === null || _34 === void 0 ? void 0 : _34.node) === null || _35 === void 0 ? void 0 : _35.address)
                        ? `Pickup ${(_37 = (_36 = order.node) === null || _36 === void 0 ? void 0 : _36.shippingLine) === null || _37 === void 0 ? void 0 : _37.title}, ${(_41 = (_40 = (_39 = (_38 = location === null || location === void 0 ? void 0 : location.locations) === null || _38 === void 0 ? void 0 : _38.edges[0]) === null || _39 === void 0 ? void 0 : _39.node) === null || _40 === void 0 ? void 0 : _40.address) === null || _41 === void 0 ? void 0 : _41.address1}, ${(_45 = (_44 = (_43 = (_42 = location === null || location === void 0 ? void 0 : location.locations) === null || _42 === void 0 ? void 0 : _42.edges[0]) === null || _43 === void 0 ? void 0 : _43.node) === null || _44 === void 0 ? void 0 : _44.address) === null || _45 === void 0 ? void 0 : _45.city}, ${(_49 = (_48 = (_47 = (_46 = location === null || location === void 0 ? void 0 : location.locations) === null || _46 === void 0 ? void 0 : _46.edges[0]) === null || _47 === void 0 ? void 0 : _47.node) === null || _48 === void 0 ? void 0 : _48.address) === null || _49 === void 0 ? void 0 : _49.zip}`
                        : "";
                    let fullAddress = fullAddressArray.join(", ");
                    if (!shippingAddress) {
                        fullAddress = pickupLocationAddress;
                    }
                    const shippingInstructions = (0, orderExportHelper_1.getShippingInstructions)(order);
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
