import ExcelJS from "exceljs";
import { countryName, metafieldText, parseDeliveryDate, street, toExcelDate, zip } from "./orders";

// Supplier printed on every dodací list (from the client's yesme-dodaci-list-example.xlsx).
export const YESME_SUPPLIER = "RR Food Delivery s.r.o., IČ: 09674631";

// Item rows are padded to this many, like the client's template; longer závozy simply get more rows.
const MIN_ITEM_ROWS = 15;
// Blank rows in the merchandising table, filled in by hand (no merchandising products in the shop yet).
const MERCHANDISING_ROWS = 4;

export const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export type DeliveryNoteLine = { name: string; quantity: number };

// One dodací list = one závoz: every order going to the same company location on the same day.
export type DeliveryNote = {
  number: string;
  deliveryDate: string;
  customer: string;
  branch: string;
  carrierNote: string;
  orderIds: string[];
  orderNames: string[];
  lines: DeliveryNoteLine[];
  totalQuantity: number;
};

// Groups orders into závozy and sums identical meals.
export const buildDeliveryNotes = (orders: any[]): DeliveryNote[] => {
  const groups = new Map<string, { deliveryYmd: string; orders: any[] }>();
  for (const order of orders) {
    const deliveryYmd = parseDeliveryDate(order?.deliveryDate?.jsonValue);
    if (!deliveryYmd) continue;
    // Orders without a B2B location (e.g. a plain customer order) get their own list.
    const locationId: string = order?.purchasingEntity?.location?.id || order?.id;
    const key = `${deliveryYmd}|${locationId}`;
    const group = groups.get(key) || { deliveryYmd, orders: [] };
    group.orders.push(order);
    groups.set(key, group);
  }

  return [...groups.values()]
    .map((group) => toDeliveryNote(group.deliveryYmd, group.orders))
    .sort((a, b) => a.deliveryDate.localeCompare(b.deliveryDate) || Number(a.number) - Number(b.number));
};

const orderNumber = (order: any) => String(order?.name || "").replace(/^#/, "");

const toDeliveryNote = (deliveryYmd: string, unsortedOrders: any[]): DeliveryNote => {
  // The list is numbered after its lowest order number, so a later order joining the same závoz
  // doesn't renumber it.
  const orders = [...unsortedOrders].sort((a, b) => Number(orderNumber(a)) - Number(orderNumber(b)));
  const first = orders[0];
  const company = first?.purchasingEntity?.company;
  const location = first?.purchasingEntity?.location;
  const shipping = first?.shippingAddress;

  const ico = metafieldText(company?.ico?.jsonValue);
  const customerName = company?.name || shipping?.company || shipping?.name || "";
  const postcode = zip(shipping?.zip).replace(/^(\d{3})(\d{2})$/, "$1 $2");
  const address = [street(shipping), shipping?.city, postcode, countryName(shipping) === "Česko" ? "" : countryName(shipping)]
    .filter(Boolean)
    .join(", ");
  // Locations are often named after the company itself; don't print the name twice.
  const branchName = location?.name && location.name.trim().toLowerCase() !== customerName.trim().toLowerCase() ? location.name : "";

  // Quantities after order edits/removals, summed per product across the závoz's orders.
  const quantities = new Map<string, DeliveryNoteLine>();
  for (const order of orders) {
    for (const edge of order?.lineItems?.edges || []) {
      const line = edge?.node;
      const quantity = Number(line?.currentQuantity ?? line?.quantity) || 0;
      if (!line || quantity <= 0) continue;
      const key = line.sku || line.title;
      const existing = quantities.get(key);
      if (existing) existing.quantity += quantity;
      else quantities.set(key, { name: line.title || "", quantity });
    }
  }
  const lines = [...quantities.values()];

  return {
    number: orderNumber(first),
    deliveryDate: deliveryYmd,
    customer: [customerName, ico && `IČ: ${ico}`].filter(Boolean).join(", "),
    branch: [branchName, address].filter(Boolean).join(", "),
    carrierNote: metafieldText(location?.carrierNote?.jsonValue),
    orderIds: orders.map((order) => order.id),
    orderNames: orders.map((order) => order.name),
    lines,
    totalQuantity: lines.reduce((sum, line) => sum + line.quantity, 0),
  };
};

export const deliveryNoteFilename = (note: DeliveryNote, suffix?: string) =>
  `dodaci-list-${note.number}${suffix ? `-${suffix}` : ""}.xlsx`;

// One sheet per závoz, named after its number.
export const buildDeliveryNotesWorkbook = async (notes: DeliveryNote[]): Promise<Buffer> => {
  const workbook = new ExcelJS.Workbook();
  notes.forEach((note) => addDeliveryNoteSheet(workbook, note));
  return Buffer.from(await workbook.xlsx.writeBuffer());
};

const THIN = { style: "thin" as const, color: { argb: "FF999999" } };
const BOX = { top: THIN, left: THIN, bottom: THIN, right: THIN };
const HEADER_FILL = { type: "pattern" as const, pattern: "solid" as const, fgColor: { argb: "FFE7E6E6" } };

// Layout follows the client's yesme-dodaci-list-example.xlsx (columns A–D).
const addDeliveryNoteSheet = (workbook: ExcelJS.Workbook, note: DeliveryNote) => {
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

  const info: [string, string | Date][] = [
    ["Dodavatel:", YESME_SUPPLIER],
    ["Odběratel:", note.customer],
    ["Pobočka:", note.branch],
    ["Datum závozu:", toExcelDate(note.deliveryDate)],
    ["Objednávky:", note.orderNames.join(", ")],
    ...(note.carrierNote ? ([["Pozn. pro dopravce:", note.carrierNote]] as [string, string][]) : []),
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

  const table = (header: string[], items: DeliveryNoteLine[], minRows: number) => {
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
      const values = [index + 1, item?.name ?? "", item ? item.quantity : null, ""];
      values.forEach((value, column) => {
        const cell = sheet.getCell(row, column + 1);
        cell.value = value;
        cell.border = BOX;
        if (column === 1) cell.alignment = { wrapText: true, vertical: "top" };
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
