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
exports.buildDeliveryNotesWorkbook = exports.deliveryNoteFilename = exports.buildDeliveryNotes = exports.XLSX_MIME = exports.YESME_SUPPLIER = void 0;
const exceljs_1 = __importDefault(require("exceljs"));
const orders_1 = require("./orders");
// Supplier printed on every dodací list (from the client's yesme-dodaci-list-example.xlsx).
exports.YESME_SUPPLIER = "RR Food Delivery s.r.o., IČ: 09674631";
// Item rows are padded to this many, like the client's template; longer závozy simply get more rows.
const MIN_ITEM_ROWS = 15;
// Blank rows in the merchandising table, filled in by hand (no merchandising products in the shop yet).
const MERCHANDISING_ROWS = 4;
exports.XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
// Groups orders into závozy and sums identical meals.
const buildDeliveryNotes = (orders) => {
    var _a, _b, _c;
    const groups = new Map();
    for (const order of orders) {
        const deliveryYmd = (0, orders_1.parseDeliveryDate)((_a = order === null || order === void 0 ? void 0 : order.deliveryDate) === null || _a === void 0 ? void 0 : _a.jsonValue);
        if (!deliveryYmd)
            continue;
        // Orders without a B2B location (e.g. a plain customer order) get their own list.
        const locationId = ((_c = (_b = order === null || order === void 0 ? void 0 : order.purchasingEntity) === null || _b === void 0 ? void 0 : _b.location) === null || _c === void 0 ? void 0 : _c.id) || (order === null || order === void 0 ? void 0 : order.id);
        const key = `${deliveryYmd}|${locationId}`;
        const group = groups.get(key) || { deliveryYmd, orders: [] };
        group.orders.push(order);
        groups.set(key, group);
    }
    return [...groups.values()]
        .map((group) => toDeliveryNote(group.deliveryYmd, group.orders))
        .sort((a, b) => a.deliveryDate.localeCompare(b.deliveryDate) || Number(a.number) - Number(b.number));
};
exports.buildDeliveryNotes = buildDeliveryNotes;
const orderNumber = (order) => String((order === null || order === void 0 ? void 0 : order.name) || "").replace(/^#/, "");
const toDeliveryNote = (deliveryYmd, unsortedOrders) => {
    var _a, _b, _c, _d, _e;
    var _f;
    // The list is numbered after its lowest order number, so a later order joining the same závoz
    // doesn't renumber it.
    const orders = [...unsortedOrders].sort((a, b) => Number(orderNumber(a)) - Number(orderNumber(b)));
    const first = orders[0];
    const company = (_a = first === null || first === void 0 ? void 0 : first.purchasingEntity) === null || _a === void 0 ? void 0 : _a.company;
    const location = (_b = first === null || first === void 0 ? void 0 : first.purchasingEntity) === null || _b === void 0 ? void 0 : _b.location;
    const shipping = first === null || first === void 0 ? void 0 : first.shippingAddress;
    const ico = (0, orders_1.metafieldText)((_c = company === null || company === void 0 ? void 0 : company.ico) === null || _c === void 0 ? void 0 : _c.jsonValue);
    const customerName = (company === null || company === void 0 ? void 0 : company.name) || (shipping === null || shipping === void 0 ? void 0 : shipping.company) || (shipping === null || shipping === void 0 ? void 0 : shipping.name) || "";
    const postcode = (0, orders_1.zip)(shipping === null || shipping === void 0 ? void 0 : shipping.zip).replace(/^(\d{3})(\d{2})$/, "$1 $2");
    const address = [(0, orders_1.street)(shipping), shipping === null || shipping === void 0 ? void 0 : shipping.city, postcode, (0, orders_1.countryName)(shipping) === "Česko" ? "" : (0, orders_1.countryName)(shipping)]
        .filter(Boolean)
        .join(", ");
    // Locations are often named after the company itself; don't print the name twice.
    const branchName = (location === null || location === void 0 ? void 0 : location.name) && location.name.trim().toLowerCase() !== customerName.trim().toLowerCase() ? location.name : "";
    // Quantities after order edits/removals, summed per product across the závoz's orders.
    const quantities = new Map();
    for (const order of orders) {
        for (const edge of ((_d = order === null || order === void 0 ? void 0 : order.lineItems) === null || _d === void 0 ? void 0 : _d.edges) || []) {
            const line = edge === null || edge === void 0 ? void 0 : edge.node;
            const quantity = Number((_f = line === null || line === void 0 ? void 0 : line.currentQuantity) !== null && _f !== void 0 ? _f : line === null || line === void 0 ? void 0 : line.quantity) || 0;
            if (!line || quantity <= 0)
                continue;
            const key = line.sku || line.title;
            const existing = quantities.get(key);
            if (existing)
                existing.quantity += quantity;
            else
                quantities.set(key, { name: line.title || "", quantity });
        }
    }
    const lines = [...quantities.values()];
    return {
        number: orderNumber(first),
        deliveryDate: deliveryYmd,
        customer: [customerName, ico && `IČ: ${ico}`].filter(Boolean).join(", "),
        branch: [branchName, address].filter(Boolean).join(", "),
        carrierNote: (0, orders_1.metafieldText)((_e = location === null || location === void 0 ? void 0 : location.carrierNote) === null || _e === void 0 ? void 0 : _e.jsonValue),
        orderIds: orders.map((order) => order.id),
        orderNames: orders.map((order) => order.name),
        lines,
        totalQuantity: lines.reduce((sum, line) => sum + line.quantity, 0),
    };
};
const deliveryNoteFilename = (note, suffix) => `dodaci-list-${note.number}${suffix ? `-${suffix}` : ""}.xlsx`;
exports.deliveryNoteFilename = deliveryNoteFilename;
// One sheet per závoz, named after its number.
const buildDeliveryNotesWorkbook = (notes) => __awaiter(void 0, void 0, void 0, function* () {
    const workbook = new exceljs_1.default.Workbook();
    notes.forEach((note) => addDeliveryNoteSheet(workbook, note));
    return Buffer.from(yield workbook.xlsx.writeBuffer());
});
exports.buildDeliveryNotesWorkbook = buildDeliveryNotesWorkbook;
const THIN = { style: "thin", color: { argb: "FF999999" } };
const BOX = { top: THIN, left: THIN, bottom: THIN, right: THIN };
const HEADER_FILL = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE7E6E6" } };
// Layout follows the client's yesme-dodaci-list-example.xlsx (columns A–D).
const addDeliveryNoteSheet = (workbook, note) => {
    const sheet = workbook.addWorksheet(note.number, {
        pageSetup: { paperSize: 9, orientation: "portrait", fitToPage: true, fitToWidth: 1, fitToHeight: 0 },
    });
    sheet.columns = [{ width: 16 }, { width: 60 }, { width: 12 }, { width: 28 }];
    let row = 1;
    sheet.getCell("A1").value = "DODACÍ LIST";
    sheet.getCell("A1").font = { bold: true, size: 16 };
    sheet.getCell("B1").value = note.number;
    sheet.getCell("B1").font = { bold: true, size: 14 };
    row = 3;
    const info = [
        ["Dodavatel:", exports.YESME_SUPPLIER],
        ["Odběratel:", note.customer],
        ["Pobočka:", note.branch],
        ["Datum závozu:", (0, orders_1.toExcelDate)(note.deliveryDate)],
        ["Objednávky:", note.orderNames.join(", ")],
        ...(note.carrierNote ? [["Pozn. pro dopravce:", note.carrierNote]] : []),
    ];
    for (const [label, value] of info) {
        sheet.getCell(row, 1).value = label;
        sheet.getCell(row, 1).font = { bold: true };
        const cell = sheet.getCell(row, 2);
        cell.value = value;
        if (value instanceof Date) {
            cell.numFmt = "d.m.yyyy";
            cell.alignment = { horizontal: "left" };
        }
        row++;
    }
    // Kurýr and Počet boxů aren't stored in Shopify yet; underlined cells to fill in.
    sheet.getCell(row, 1).value = "Kurýr:";
    sheet.getCell(row, 3).value = "Počet boxů:";
    sheet.getCell(row, 1).font = { bold: true };
    sheet.getCell(row, 3).font = { bold: true };
    sheet.getCell(row, 2).border = { bottom: THIN };
    sheet.getCell(row, 4).border = { bottom: THIN };
    row += 2;
    const table = (header, items, minRows) => {
        var _a;
        header.forEach((label, index) => {
            const cell = sheet.getCell(row, index + 1);
            cell.value = label;
            cell.font = { bold: true };
            cell.fill = HEADER_FILL;
            cell.border = BOX;
        });
        row++;
        const firstRow = row;
        const count = Math.max(items.length, minRows);
        for (let index = 0; index < count; index++) {
            const item = items[index];
            const values = [index + 1, (_a = item === null || item === void 0 ? void 0 : item.name) !== null && _a !== void 0 ? _a : "", item ? item.quantity : null, ""];
            values.forEach((value, column) => {
                const cell = sheet.getCell(row, column + 1);
                cell.value = value;
                cell.border = BOX;
                if (column === 1)
                    cell.alignment = { wrapText: true, vertical: "top" };
            });
            row++;
        }
        const lastRow = row - 1;
        sheet.getCell(row, 1).value = "Celkem ks";
        sheet.getCell(row, 3).value = {
            formula: `SUM(C${firstRow}:C${lastRow})`,
            result: items.reduce((sum, item) => sum + item.quantity, 0),
        };
        for (let column = 1; column <= 4; column++) {
            sheet.getCell(row, column).font = { bold: true };
            sheet.getCell(row, column).border = BOX;
        }
        row += 3;
    };
    table(["Poř. č.", "Název dodaného zboží", "Počet ks", "Poznámka"], note.lines, MIN_ITEM_ROWS);
    table(["Poř. č.", "Merchandising", "Počet ks", "Poznámka"], [], MERCHANDISING_ROWS);
    for (const label of ["Převzal:", "Podpis:"]) {
        sheet.getCell(row, 1).value = label;
        sheet.getCell(row, 1).font = { bold: true };
        sheet.getCell(row, 2).border = { bottom: THIN };
        row += 2;
    }
};
