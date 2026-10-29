import { Request, Response } from "express";
import dotenv from "dotenv";
import ExcelJS from "exceljs";
import path from "path";
import { sendYesmeEmail } from "../utils/email";
import {
  countryName,
  czechSlashDate,
  fetchOrders,
  isoToYmd,
  metafieldText,
  parseDeliveryDate,
  resolveDeliveryWindow,
  street,
  toExcelDate,
  yesmeClient,
  zip,
} from "../utils/orders";

dotenv.config();

const { YESME_ORDER_EXPORT_RECIPIENTS } = process.env;

const COLUMNS = [
  { header: "Č. Objednávky", key: "orderNumber", width: 15 },
  { header: "Datum objednávky", key: "orderDate", width: 16 },
  { header: "Datum dodání", key: "deliveryDate", width: 16 },
  { header: "Jméno", key: "firstName", width: 16 },
  { header: "Příjmení", key: "lastName", width: 16 },
  { header: "Firma", key: "company", width: 18 },
  { header: "IČ", key: "ico", width: 14 },
  { header: "DIČ", key: "dic", width: 14 },
  { header: "Ulice (FAK)", key: "billingStreet", width: 18 },
  { header: "Město (FAK)", key: "billingCity", width: 16 },
  { header: "PSČ (FAK)", key: "billingZip", width: 14 },
  { header: "Země (FAK)", key: "billingCountry", width: 14 },
  { header: "Ulice (DOD)", key: "shippingStreet", width: 18 },
  { header: "Město (DOD)", key: "shippingCity", width: 16 },
  { header: "PSČ (DOD)", key: "shippingZip", width: 14 },
  { header: "Země (DOD)", key: "shippingCountry", width: 14 },
  { header: "Kontaktní telefon pro dopravce", key: "phone", width: 22 },
  { header: "Poznámka pro dopravce", key: "carrierNote", width: 22 },
  { header: "Dodací okno start", key: "windowStart", width: 16 },
  { header: "Dodací okno stop", key: "windowStop", width: 16 },
  { header: "Produkt", key: "product", width: 40 },
  { header: "Počet ks", key: "quantity", width: 12 },
  { header: "Typ rukávu", key: "sleeveType", width: 16 },
  { header: "Ceník", key: "priceList", width: 18 },
  { header: "Jednotková cena", key: "unitPrice", width: 16 },
  { header: "Cena Celkem", key: "lineTotal", width: 16 },
];

export const yesme_orders_export = async (req: Request, res: Response) => {
  try {
    const window = resolveDeliveryWindow(req.query.date);
    if ("error" in window) {
      return res.status(400).json({ error: window.error });
    }
    if ("skipped" in window) {
      return res.status(200).json({
        skipped: true,
        reason: "Yes Me export runs on Thursday only. Pass ?date=YYYY-MM-DD to override.",
        today: window.today,
      });
    }

    const { start, end } = window;
    const client = yesmeClient();
    const orders = await fetchOrders(client, start, end);
    const rows = orders.flatMap((order) => orderToRows(order, start, end));

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`Objednávky ${czechSlashDate(start).replace(/\d{4}$/, "")}–${czechSlashDate(end)}`);
    worksheet.columns = COLUMNS;

    for (const row of rows) {
      const added = worksheet.addRow(row);
      added.getCell("orderDate").numFmt = "DD.MM.YYYY";
      added.getCell("deliveryDate").numFmt = "DD.MM.YYYY";
      added.getCell("unitPrice").numFmt = "0.00";
      added.getCell("lineTotal").numFmt = "0.00";
    }

    const fileName = `yesme-orders-${start}-to-${end}.xlsx`;
    const buffer = await workbook.xlsx.writeBuffer();
    const attachment = {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      name: fileName,
      content: Buffer.from(buffer).toString("base64"),
    };

    const shouldSendEmail = req.query.sendEmail !== "false";
    const isRevisedDoc = req.query.revised === "true";
    const recipientEmails = YESME_ORDER_EXPORT_RECIPIENTS as string;
    if (shouldSendEmail && recipientEmails) {
      try {
        await sendYesmeEmail(
          `Yes Me objednávky ${start} – ${end}${isRevisedDoc ? " (opravný export)" : ""}`,
          recipientEmails,
          `Objednávky s datem dodání ${czechSlashDate(start)} až ${czechSlashDate(end)} jsou připraveny k exportu.`,
          attachment,
        );
      } catch (error) {
        console.error("yesme_orders_export: email failed", error);
        return res.status(502).json({ start, end, orders: orders.length, emailed: false, error: String((error as Error)?.message || error) });
      }
    }

    // ?download=true also stores the .xlsx in the server's working directory (git-ignored).
    const savedTo = req.query.download === "true" ? path.resolve(fileName) : null;
    if (savedTo) await workbook.xlsx.writeFile(savedTo);

    return res.status(200).json({
      start,
      end,
      orders: orders.length,
      rows: rows.length,
      emailed: Boolean(shouldSendEmail && recipientEmails),
      savedTo,
      attachment,
    });
  } catch (error) {
    console.error("yesme_orders_export failed", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const orderToRows = (order: any, start: string, end: string) => {
  const deliveryYmd = parseDeliveryDate(order?.deliveryDate?.jsonValue);
  if (!deliveryYmd || deliveryYmd < start || deliveryYmd > end) return [];

  const billing = order?.billingAddress;
  const shipping = order?.shippingAddress;
  const company = order?.purchasingEntity?.company;
  const location = order?.purchasingEntity?.location;
  const orderNumber = String(order?.name || "").replace(/^#/, "");
  const firstName = shipping?.firstName || billing?.firstName || order?.customer?.firstName || splitName(shipping?.name || billing?.name).firstName;
  const lastName = shipping?.lastName || billing?.lastName || order?.customer?.lastName || splitName(shipping?.name || billing?.name).lastName;

  const shared = {
    orderNumber,
    orderDate: toExcelDate(isoToYmd(order?.createdAt)),
    deliveryDate: toExcelDate(deliveryYmd),
    firstName: firstName || "",
    lastName: lastName || "",
    company: company?.name || shipping?.company || billing?.company || "",
    ico: metafieldText(company?.ico?.jsonValue),
    dic: metafieldText(company?.dic?.jsonValue),
    billingStreet: street(billing),
    billingCity: billing?.city || "",
    billingZip: zip(billing?.zip),
    billingCountry: countryName(billing),
    shippingStreet: street(shipping),
    shippingCity: shipping?.city || "",
    shippingZip: zip(shipping?.zip),
    shippingCountry: countryName(shipping),
    phone: shipping?.phone || order?.customer?.defaultPhoneNumber?.phoneNumber || "",
    carrierNote: metafieldText(location?.carrierNote?.jsonValue),
    windowStart: "",
    windowStop: "",
    sleeveType: metafieldText(location?.priceList?.reference?.sleeveType?.jsonValue),
    priceList: priceListName(location),
  };

  return (order?.lineItems?.edges || [])
    .map((edge: any) => edge?.node)
    // Quantities after order edits: removed items have currentQuantity 0 and are skipped.
    .filter((line: any) => line && lineQuantity(line) > 0)
    .map((line: any) => {
      const quantity = lineQuantity(line);
      const unitPrice = lineUnitPrice(line);
      return {
        ...shared,
        product: line.title || "",
        quantity,
        unitPrice,
        lineTotal: roundMoney(quantity * unitPrice),
      };
    });
};

const splitName = (name?: string) => {
  const parts = String(name || "")
    .trim()
    .split(/\s+/);
  if (!parts[0]) return { firstName: "", lastName: "" };
  if (parts.length === 1) return { firstName: parts[0], lastName: "" };
  return { firstName: parts[0], lastName: parts.slice(1).join(" ") };
};

const priceListName = (location: any) => {
  const reference = location?.priceList?.reference;
  if (!reference) return "";
  const named = reference?.name?.jsonValue;
  if (named != null && String(named).trim() !== "") return String(named);
  return reference.displayName || reference.handle || "";
};

const lineUnitPrice = (line: any) => {
  const fromProp = line?.customAttributes?.find((attribute: any) => attribute.key === "_b2b_price")?.value;
  const parsed = Number(fromProp);
  if (Number.isFinite(parsed)) return parsed;
  const fallback = Number(line?.discountedUnitPriceSet?.shopMoney?.amount);
  return Number.isFinite(fallback) ? fallback : 0;
};

const lineQuantity = (line: any) => Number(line?.currentQuantity ?? line?.quantity) || 0;

const roundMoney = (value: number) => Math.round(value * 100) / 100;
