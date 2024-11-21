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
dotenv_1.default.config();
const { ACCESS_TOKEN, STORE, API_VERSION, ORDER_EXPORT_RECIPIENTS } = process.env;
const recipientEmails = ORDER_EXPORT_RECIPIENTS;
/*-------------------------------------MAIN FUNCTION------------------------------------------------*/
const orders_export = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t, _u, _v, _w, _x, _y, _z, _0, _1, _2, _3, _4, _5, _6, _7, _8, _9, _10;
    try {
        const client = new graphql_request_1.GraphQLClient(`https://${STORE}/admin/api/${API_VERSION}/graphql.json`, {
            // @ts-ignore
            headers: {
                "X-Shopify-Access-Token": ACCESS_TOKEN,
            },
        });
        let yesterday = getYesterday();
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
                    if (line.node.originalTotalSet.shopMoney.amount -
                        line.node.totalDiscountSet.shopMoney.amount >
                        0) {
                        addons.push(line);
                    }
                    else {
                        promo.push(line);
                    }
                }
            }
            for (const [lineIndex, line] of mainItems.entries()) {
                let programStartDate, programEndDate;
                let lineIsProgram = (_d = (_c = (_b = (_a = line === null || line === void 0 ? void 0 : line.node) === null || _a === void 0 ? void 0 : _a.variant) === null || _b === void 0 ? void 0 : _b.product) === null || _c === void 0 ? void 0 : _c.tags) === null || _d === void 0 ? void 0 : _d.includes("Programy");
                let lineQuantity = line.node.quantity;
                let promoField;
                let addonsField;
                for (let i = 0; i < lineQuantity; i++) {
                    if (lineIsProgram && order.node.customAttributes) {
                        for (const attribute of order.node.customAttributes) {
                            if (attribute.key === "Datum začátku Yes Krabiček") {
                                programStartDate = attribute.value;
                            }
                            if (attribute.key ===
                                `Konec_${(_g = (_f = (_e = line.node) === null || _e === void 0 ? void 0 : _e.variant) === null || _f === void 0 ? void 0 : _f.id) === null || _g === void 0 ? void 0 : _g.replace("gid://shopify/ProductVariant/", "")}`) {
                                programEndDate = attribute.value;
                            }
                        }
                    }
                    let customAttributes = (_j = (_h = order.node) === null || _h === void 0 ? void 0 : _h.customAttributes) === null || _j === void 0 ? void 0 : _j.map((attr) => {
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
                    const row = [
                        (_k = order.node) === null || _k === void 0 ? void 0 : _k.name,
                        (_l = order.node) === null || _l === void 0 ? void 0 : _l.displayFinancialStatus,
                        (_o = (_m = order.node) === null || _m === void 0 ? void 0 : _m.billingAddress) === null || _o === void 0 ? void 0 : _o.name,
                        ((_q = (_p = order.node) === null || _p === void 0 ? void 0 : _p.shippingAddress) === null || _q === void 0 ? void 0 : _q.name) || "",
                        ((_s = (_r = order.node) === null || _r === void 0 ? void 0 : _r.shippingAddress) === null || _s === void 0 ? void 0 : _s.company) || "",
                        ((_u = (_t = order.node) === null || _t === void 0 ? void 0 : _t.shippingAddress) === null || _u === void 0 ? void 0 : _u.phone) ||
                            ((_w = (_v = order.node) === null || _v === void 0 ? void 0 : _v.billingAddress) === null || _w === void 0 ? void 0 : _w.phone) ||
                            "",
                        ((_y = (_x = order.node) === null || _x === void 0 ? void 0 : _x.shippingAddress) === null || _y === void 0 ? void 0 : _y.address1) ||
                            `Pickup ${(_0 = (_z = order.node) === null || _z === void 0 ? void 0 : _z.shippingLine) === null || _0 === void 0 ? void 0 : _0.title}` ||
                            "",
                        ((_2 = (_1 = order.node) === null || _1 === void 0 ? void 0 : _1.shippingAddress) === null || _2 === void 0 ? void 0 : _2.city) || "",
                        ((_4 = (_3 = order.node) === null || _3 === void 0 ? void 0 : _3.shippingAddress) === null || _4 === void 0 ? void 0 : _4.zip) || "",
                        (_5 = order.node) === null || _5 === void 0 ? void 0 : _5.note,
                        customAttributes === null || customAttributes === void 0 ? void 0 : customAttributes.join("\n"),
                        addonsField ? addonsField : "",
                        promoField ? promoField : "",
                        programStartDate,
                        programEndDate,
                        line.node.title,
                        lineIsProgram
                            ? (_8 = (_7 = (_6 = line.node) === null || _6 === void 0 ? void 0 : _6.title) === null || _7 === void 0 ? void 0 : _7.split(" | ")[1]) === null || _8 === void 0 ? void 0 : _8.replace(" kcal", "")
                            : "",
                        severeAllergic ? "Ano" : "",
                    ];
                    if (lineIsProgram) {
                        let allergens = (_10 = (_9 = line.node) === null || _9 === void 0 ? void 0 : _9.customAttributes) === null || _10 === void 0 ? void 0 : _10.find((attr) => attr.key == "Alergeny" && attr.value != "");
                        if (allergens) {
                            allergens = allergens.value
                                .split(",")
                                .map((allergen) => allergen.trim());
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
        const sendEmail = yield (0, notification_1.sendNotification)(`Objednávky ${yesterday}`, recipientEmails, `Objednávky ze dne ${yesterday} jsou připraveny k exportu`, false, attachment);
        return res.status(200).json(sendEmail);
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
