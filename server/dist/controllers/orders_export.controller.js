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
dotenv_1.default.config();
const { ACCESS_TOKEN, STORE, API_VERSION, ORDER_EXPORT_RECIPIENTS, MANDRILL_MESSAGE_BCC_ADDRESS_DEV } = process.env;
const recipientEmails = ORDER_EXPORT_RECIPIENTS;
/*-------------------------------------MAIN FUNCTION------------------------------------------------*/
const orders_export = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7, _8, _9, _10, _11, _12, _13, _14, _15, _16, _17, _18, _19, _20, _21, _22, _23, _24, _25, _26, _27;
    try {
        const client = new graphql_request_1.GraphQLClient(`https://${STORE}/admin/api/${API_VERSION}/graphql.json`, {
            // @ts-ignore
            headers: {
                "X-Shopify-Access-Token": ACCESS_TOKEN,
            },
        });
        let yesterday = getYesterday();
        // yesterday = "2025-02-25";
        const latestOrders = yield client.request(orders_1.ordersQuery, {
            query: `(created_at:'${yesterday}' AND financial_status:'paid') OR tag:'Zaplaceno ${yesterday}'`,
        });
        const workbook = new exceljs_1.default.Workbook();
        const worksheet = workbook.addWorksheet(`Objednávky ${yesterday}`);
        for (const [orderIndex, order] of latestOrders.orders.edges.entries()) {
            let severeAllergic = order.node.customAttributes.find((attr) => {
                return attr.key == "Jsem prudký alergik" && attr.value == "Ano";
            });
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
                    { header: "Note", key: "note", width: 15 },
                    { header: "Note Attributes", key: "noteAttributes", width: 15 },
                    { header: "Doplňkový prodej", key: "addon", width: 15 },
                    { header: "Promo", key: "promo", width: 15 },
                    { header: "Start Date", key: "startDate", width: 15 },
                    { header: "End Date", key: "endDate", width: 15 },
                    { header: "Line Item Name", key: "lineItemName", width: 30 },
                    { header: "Program Length", key: "programLength", width: 10 },
                    { header: "Kcal", key: "kcal", width: 10 },
                    { header: "Prudký alergik", key: "severeAllergic", width: 10 },
                ];
                constants_1.ALLERGENS.split(",").forEach((allergen) => {
                    header.push({ header: allergen, key: allergen, width: 10 });
                });
                worksheet.columns = header;
            }
            let oneTypeOrder = order.node.lineItems.edges.every((line) => {
                return line.node.variant.product.tags.includes("Programy");
            }) ||
                order.node.lineItems.edges.every((line) => {
                    return !line.node.variant.product.tags.includes("Programy");
                }) ||
                false;
            let mixedOrder = oneTypeOrder ? false : true;
            let programsItems = order.node.lineItems.edges.filter((line) => {
                return line.node.variant.product.tags.includes("Programy");
            });
            let nonProgramItems = order.node.lineItems.edges.filter((line) => {
                return !line.node.variant.product.tags.includes("Programy");
            });
            let mainItems = [];
            if (oneTypeOrder) {
                if (programsItems.length > 0) {
                    mainItems = programsItems;
                }
                else if (nonProgramItems.length > 0) {
                    mainItems = nonProgramItems;
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
            if (mixedOrder) {
                for (const [lineIndex, line] of secondaryItems.entries()) {
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
                let lineIsProgram = (_d = (_c = (_b = (_a = line === null || line === void 0 ? void 0 : line.node) === null || _a === void 0 ? void 0 : _a.variant) === null || _b === void 0 ? void 0 : _b.product) === null || _c === void 0 ? void 0 : _c.tags) === null || _d === void 0 ? void 0 : _d.includes("Programy");
                let lineQuantity = line.node.quantity;
                let promoField, addonsField;
                if (lineIsProgram) {
                    programLength = (_h = (_g = (_f = (_e = line.node) === null || _e === void 0 ? void 0 : _e.variant) === null || _f === void 0 ? void 0 : _f.title) === null || _g === void 0 ? void 0 : _g.split("(")[1]) === null || _h === void 0 ? void 0 : _h.split(")")[0];
                }
                for (let i = 0; i < lineQuantity; i++) {
                    if (lineIsProgram && order.node.customAttributes) {
                        for (const attribute of order.node.customAttributes) {
                            if (attribute.key === "Datum začátku Yes Krabiček") {
                                programStartDate = attribute.value;
                            }
                            if (attribute.key === `Konec_${(_l = (_k = (_j = line.node) === null || _j === void 0 ? void 0 : _j.variant) === null || _k === void 0 ? void 0 : _k.id) === null || _l === void 0 ? void 0 : _l.replace("gid://shopify/ProductVariant/", "")}`) {
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
                                        return (line.node.title === mainLine.node.title &&
                                            !mainLine.node.customAttributes.find((attr) => attr.key == "AKCE"));
                                    });
                                    let mainProgramEndDate = order.node.customAttributes.find((attr) => {
                                        var _a, _b, _c;
                                        return (attr.key ===
                                            `Konec_${(_c = (_b = (_a = mainProgram === null || mainProgram === void 0 ? void 0 : mainProgram.node) === null || _a === void 0 ? void 0 : _a.variant) === null || _b === void 0 ? void 0 : _b.id) === null || _c === void 0 ? void 0 : _c.replace("gid://shopify/ProductVariant/", "")}`);
                                    });
                                    programStartDate = (0, helpers_1.getFutureBusinessDate)((0, helpers_1.convertDateToISOString)(mainProgramEndDate.value), 1);
                                    programEndDate = (0, helpers_1.convertDateToLocalString)((0, helpers_1.getFutureBusinessDate)(programStartDate, 4)).replace(/\./g, "-");
                                    programStartDate = (0, helpers_1.convertDateToLocalString)(programStartDate).replace(/\./g, "-");
                                }
                            }
                        }
                    }
                    let customAttributes = (_o = (_m = order.node) === null || _m === void 0 ? void 0 : _m.customAttributes) === null || _o === void 0 ? void 0 : _o.map((attr) => {
                        return `${attr.key}: ${attr.value}`;
                    });
                    if (lineIndex == 0 && mixedOrder) {
                        if (promo.length > 0)
                            promoField = promo
                                .map((item) => {
                                return `${item.node.quantity} x ${item.node.title}`;
                            })
                                .join("\n");
                        if (addons.length > 0)
                            addonsField = addons
                                .map((item) => {
                                return `${item.node.quantity} x ${item.node.title}`;
                            })
                                .join("\n");
                    }
                    let shippingAddress;
                    if (((_q = (_p = order.node) === null || _p === void 0 ? void 0 : _p.shippingAddress) === null || _q === void 0 ? void 0 : _q.address1) && !((_s = (_r = order.node) === null || _r === void 0 ? void 0 : _r.shippingAddress) === null || _s === void 0 ? void 0 : _s.address2)) {
                        shippingAddress = (_u = (_t = order.node) === null || _t === void 0 ? void 0 : _t.shippingAddress) === null || _u === void 0 ? void 0 : _u.address1;
                    }
                    else if (((_w = (_v = order.node) === null || _v === void 0 ? void 0 : _v.shippingAddress) === null || _w === void 0 ? void 0 : _w.address1) && ((_y = (_x = order.node) === null || _x === void 0 ? void 0 : _x.shippingAddress) === null || _y === void 0 ? void 0 : _y.address2)) {
                        shippingAddress = `${(_0 = (_z = order.node) === null || _z === void 0 ? void 0 : _z.shippingAddress) === null || _0 === void 0 ? void 0 : _0.address1} ${(_2 = (_1 = order.node) === null || _1 === void 0 ? void 0 : _1.shippingAddress) === null || _2 === void 0 ? void 0 : _2.address2}`;
                    }
                    const row = [
                        (_3 = order.node) === null || _3 === void 0 ? void 0 : _3.name,
                        (_4 = order.node) === null || _4 === void 0 ? void 0 : _4.displayFinancialStatus,
                        (_6 = (_5 = order.node) === null || _5 === void 0 ? void 0 : _5.billingAddress) === null || _6 === void 0 ? void 0 : _6.name,
                        ((_8 = (_7 = order.node) === null || _7 === void 0 ? void 0 : _7.shippingAddress) === null || _8 === void 0 ? void 0 : _8.name) || "",
                        ((_10 = (_9 = order.node) === null || _9 === void 0 ? void 0 : _9.shippingAddress) === null || _10 === void 0 ? void 0 : _10.company) || "",
                        ((_12 = (_11 = order.node) === null || _11 === void 0 ? void 0 : _11.shippingAddress) === null || _12 === void 0 ? void 0 : _12.phone) || ((_14 = (_13 = order.node) === null || _13 === void 0 ? void 0 : _13.billingAddress) === null || _14 === void 0 ? void 0 : _14.phone) || "",
                        shippingAddress || `Pickup ${(_16 = (_15 = order.node) === null || _15 === void 0 ? void 0 : _15.shippingLine) === null || _16 === void 0 ? void 0 : _16.title}` || "",
                        ((_18 = (_17 = order.node) === null || _17 === void 0 ? void 0 : _17.shippingAddress) === null || _18 === void 0 ? void 0 : _18.city) || "",
                        ((_20 = (_19 = order.node) === null || _19 === void 0 ? void 0 : _19.shippingAddress) === null || _20 === void 0 ? void 0 : _20.zip) || "",
                        (_21 = order.node) === null || _21 === void 0 ? void 0 : _21.note,
                        customAttributes === null || customAttributes === void 0 ? void 0 : customAttributes.join("\n"),
                        addonsField ? addonsField : "",
                        promoField ? promoField : "",
                        programStartDate,
                        programEndDate,
                        (_22 = line.node) === null || _22 === void 0 ? void 0 : _22.title,
                        programLength ? programLength : "",
                        lineIsProgram ? (_25 = (_24 = (_23 = line.node) === null || _23 === void 0 ? void 0 : _23.title) === null || _24 === void 0 ? void 0 : _24.split(" | ")[1]) === null || _25 === void 0 ? void 0 : _25.replace(" kcal", "") : "",
                        severeAllergic ? "Ano" : "",
                    ];
                    if (lineIsProgram) {
                        let allergens = (_27 = (_26 = line.node) === null || _26 === void 0 ? void 0 : _26.customAttributes) === null || _27 === void 0 ? void 0 : _27.find((attr) => attr.key == "Alergeny" && attr.value != "");
                        if (order.node.customAttributes && order.node.sourceName == "shopify_draft_order") {
                            for (const attribute of order.node.customAttributes) {
                                if (attribute.key.includes("Alergeny")) {
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
                                if (colNumber > 17) {
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
        let attachment = {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            name: `orders-${yesterday}.xlsx`,
            content: base64Content,
        };
        const sendEmail = yield (0, notification_1.sendNotification)(`Objednávky ${yesterday}`, recipientEmails, `Objednávky ze dne ${yesterday} jsou připraveny k exportu`, MANDRILL_MESSAGE_BCC_ADDRESS_DEV, attachment);
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
