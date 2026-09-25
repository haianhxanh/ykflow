import fs from "fs";
import path from "path";
import PDFDocument from "pdfkit";

const DEFAULT_VAT_RATE = 0.21;
const REDUCED_VAT_RATE = 0.12;

export const TRABUCCO_SELLER = {
  name: "SR TRADING, s.r.o.",
  brand: "Trabucco Fish",
  addressLines: ["Rybná 716/24", "110 00 Praha 1"],
  ico: "03676161",
  dic: "CZ03676161",
  warehouse: "Ke Kablu 683/3, 102 00 Praha-Dolní Měcholupy",
  web: "www.trabuccofish.cz",
};

export type PackingSlipLine = {
  name: string;
  sku: string | null;
  quantityLabel: string;
  unitNet: number;
  discountPercent: number;
  unitNetAfterDiscount: number;
  lineNet: number;
  vatPercent: number;
  vatAmount: number;
  lineGross: number;
  ean?: string | null;
  // Doporučená maloobchodní cena vč. DPH, rounded to whole CZK: variant price + 21 % (12 % for the "DPH 12%" collection).
  dmoc?: number | null;
};

export type PackingSlip = {
  orderName: string;
  issuedAt: string;
  shippingMethod: string | null;
  paymentMethod: string | null;
  customerEmail: string | null;
  buyerLines: string[];
  lines: PackingSlipLine[];
  // Authoritative order-level totals from Shopify (not re-derived by summing rounded line
  // items), so this always matches what's shown in Shopify Admin exactly.
  totals: { subtotal: number; discount: number; shipping: number; vat: number; gross: number };
};

type MoneyBag = { shopMoney?: { amount?: string } } | null | undefined;
type TaxLine = { rate?: number | null; ratePercentage?: number | null; priceSet?: MoneyBag };
type DiscountAllocation = { allocatedAmountSet?: MoneyBag };

const money = (bag: MoneyBag): number => parseFloat(bag?.shopMoney?.amount ?? "0") || 0;
const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;
const sumDiscountAllocations = (allocations: DiscountAllocation[] | undefined): number =>
  round2((allocations ?? []).reduce((sum, a) => sum + money(a.allocatedAmountSet), 0));

const formatCzk = (n: number) =>
  new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK" }).format(n);

const formatCzkWhole = (n: number) =>
  new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK", maximumFractionDigits: 0 }).format(n);

const formatPercent = (n: number) => {
  const shown = Math.abs(n - Math.round(n)) < 0.05 ? String(Math.round(n)) : n.toFixed(1).replace(".", ",");
  return `${shown} %`;
};

const formatCzDate = (iso: string) =>
  new Intl.DateTimeFormat("cs-CZ", {
    timeZone: "Europe/Prague",
    day: "numeric",
    month: "numeric",
    year: "numeric",
  }).format(new Date(iso));

const compactAddress = (address: any | null | undefined): string[] => {
  if (!address) return [];
  return [address.company, address.address1, address.address2, [address.zip, address.city].filter(Boolean).join(" "), address.country].filter(
    (part): part is string => Boolean(part && String(part).trim())
  );
};

const vatRateFrom = (taxLines: TaxLine[] | undefined): number => {
  const first = taxLines?.[0];
  if (typeof first?.rate === "number" && first.rate > 0) return first.rate;
  if (typeof first?.ratePercentage === "number" && first.ratePercentage > 0) return first.ratePercentage / 100;
  return DEFAULT_VAT_RATE;
};

const paymentLabel = (gatewayNames: string[] | undefined): string => {
  if (!gatewayNames?.length) return "Neuvedeno";
  if (gatewayNames.some((name) => /manual|bank|invoice|faktura|převod|prevod|deposit/i.test(name))) {
    return "Platba na fakturu";
  }
  return gatewayNames.join(", ");
};

const sumTaxAmount = (taxLines: TaxLine[] | undefined): number =>
  round2((taxLines ?? []).reduce((sum, t) => sum + money(t.priceSet), 0));

// Built directly from Shopify's own already-computed line-level totals (originalTotal,
// discountedTotal, and the actual taxLines amount) instead of taking a per-unit price and
// multiplying it out to the quantity. That per-unit approach rounds the unit price to 2
// decimals *before* multiplying by quantity, which on a qty-20 line can drift the total by
// up to 20x the per-unit rounding error (e.g. a SKU that should total 975.84 came out as
// 975.80 -- small on one line, but it doesn't match Shopify, and compounds across the order).
const pricedLine = (
  name: string,
  sku: string | null,
  quantity: number,
  quantityLabel: string,
  originalTotal: number,
  discountedTotal: number,
  taxAmount: number,
  vatRatePercent: number,
  taxesIncluded: boolean
): PackingSlipLine => {
  const net = taxesIncluded ? round2(discountedTotal - taxAmount) : round2(discountedTotal);
  const gross = taxesIncluded ? round2(discountedTotal) : round2(discountedTotal + taxAmount);
  const originalNet = taxesIncluded ? round2(originalTotal - (originalTotal * vatRatePercent) / (100 + vatRatePercent)) : round2(originalTotal);
  const discountPercent = originalNet <= 0 ? 0 : round2((1 - net / originalNet) * 100);
  return {
    name,
    sku,
    quantityLabel,
    unitNet: quantity > 0 ? round2(originalNet / quantity) : originalNet,
    discountPercent: Math.max(0, discountPercent),
    unitNetAfterDiscount: quantity > 0 ? round2(net / quantity) : net,
    lineNet: net,
    vatPercent: round2(vatRatePercent),
    vatAmount: round2(taxAmount),
    lineGross: gross,
  };
};

// "shopify" (default): authoritative, matches Shopify Admin exactly -- use for every order
// going forward.
// "invoice": replicates a specific historical bug in the Fakturoid bridge, which built invoices
// from Shopify's discountedUnitPriceAfterAllDiscountsSet (a per-unit price Shopify *truncates*,
// not rounds, to 2 decimals, before multiplying by quantity). Only use this for an order whose
// wrong invoice has *already* been sent to the client/accountant, so the packing slip doesn't
// contradict a document they already have. Reconstructs the invoice's net (ZÁKLAD) exactly;
// VAT lands within ~3 haléřů of the invoice's own total -- the last few haléřů of Fakturoid's
// internal VAT rounding couldn't be reverse-engineered with certainty, but this is far closer
// to that invoice than the correct Shopify total is.
export type PackingSlipBasis = "shopify" | "invoice";

export const mapOrderToPackingSlip = (order: any, basis: PackingSlipBasis = "shopify"): PackingSlip => {
  const taxesIncluded = Boolean(order.taxesIncluded);
  const shippingAddress = order.shippingAddress;
  const billingAddress = order.billingAddress;
  const buyerLines = compactAddress(shippingAddress).length ? compactAddress(shippingAddress) : compactAddress(billingAddress);
  const attrs: { key?: string; value?: string }[] = order.customAttributes ?? [];
  const ico = attrs.find((a) => a.key?.toLowerCase() === "ico")?.value;
  const dic = attrs.find((a) => a.key?.toLowerCase() === "dic")?.value;
  if (ico || dic) {
    buyerLines.push([ico && `IČO: ${ico}`, dic && `DIČ: ${dic}`].filter(Boolean).join("  ·  "));
  }
  if (order.email) buyerLines.push(order.email);
  const phone = shippingAddress?.phone || billingAddress?.phone || order.phone;
  if (phone) buyerLines.push(phone);

  // Only populated/used in basis="invoice" mode -- totals are summed from the reconstructed
  // lines below instead of pulled from Shopify's (correct) order-level aggregates, since those
  // aggregates don't match the already-sent invoice this mode is replicating.
  let invoiceSubtotal = 0;
  let invoiceDiscount = 0;
  let invoiceVat = 0;
  let invoiceGross = 0;

  const buildLine = (
    name: string,
    sku: string | null,
    qty: number,
    quantityLabel: string,
    originalTotal: number,
    shopifyDiscountedTotal: number,
    shopifyTaxAmount: number,
    unitDiscounted: number | null,
    vatRatePercent: number,
    includeInSubtotal: boolean
  ): PackingSlipLine => {
    let discountedTotal = shopifyDiscountedTotal;
    let taxAmount = shopifyTaxAmount;
    if (basis === "invoice") {
      // Replicates the Fakturoid bridge's own math for the invoice already sent: per-unit
      // discounted price (which Shopify truncates, not rounds, to 2 decimals) multiplied out
      // to quantity, then VAT computed as the base row's VAT minus the discount row's VAT --
      // matching the invoice's two-rows-per-item layout, each independently rounded.
      discountedTotal = round2((unitDiscounted ?? shopifyDiscountedTotal / (qty || 1)) * qty);
      const discountTotal = round2(originalTotal - discountedTotal);
      const baseVat = round2((originalTotal * vatRatePercent) / 100);
      const discountVat = round2((discountTotal * vatRatePercent) / 100);
      taxAmount = round2(baseVat - discountVat);
    }
    const line = pricedLine(name, sku, qty, quantityLabel, originalTotal, discountedTotal, taxAmount, vatRatePercent, taxesIncluded);
    if (basis === "invoice") {
      if (includeInSubtotal) {
        invoiceSubtotal = round2(invoiceSubtotal + originalTotal);
        invoiceDiscount = round2(invoiceDiscount + round2(originalTotal - discountedTotal));
      }
      invoiceVat = round2(invoiceVat + taxAmount);
      invoiceGross = round2(invoiceGross + line.lineGross);
    }
    return line;
  };

  const lines: PackingSlipLine[] = (order.lineItems?.edges ?? [])
    .map((edge: any) => edge.node)
    .filter((node: any) => (node.currentQuantity ?? 0) > 0)
    .map((node: any) => {
      const qty = node.currentQuantity as number;
      // Custom items (no variant) have no known retail price, so DMOC is left blank for them.
      const variantPrice = node.variant ? parseFloat(node.variant.price ?? "") : NaN;
      const retailVatRate = node.variant?.product?.inCollection ? REDUCED_VAT_RATE : DEFAULT_VAT_RATE;
      const vatRatePercent = round2(vatRateFrom(node.taxLines) * 100);
      const originalTotal = money(node.originalTotalSet);
      const discountedTotal = round2(originalTotal - sumDiscountAllocations(node.discountAllocations));
      const line = buildLine(
        node.name || node.title,
        node.sku || node.variant?.sku || null,
        qty,
        `${qty} ks`,
        originalTotal,
        discountedTotal,
        sumTaxAmount(node.taxLines),
        money(node.discountedUnitPriceAfterAllDiscountsSet),
        vatRatePercent,
        true
      );
      return {
        ...line,
        ean: node.variant?.barcode || null,
        dmoc: Number.isFinite(variantPrice) ? Math.round(variantPrice * (1 + retailVatRate)) : null,
      };
    });

  if (order.shippingLine?.title) {
    const vatRatePercent = round2(vatRateFrom(order.shippingLine.taxLines) * 100);
    const originalShipping = money(order.shippingLine.originalPriceSet);
    const discountedShipping = round2(originalShipping - sumDiscountAllocations(order.shippingLine.discountAllocations));
    lines.push(
      buildLine(
        order.shippingLine.title,
        null,
        1,
        "1",
        originalShipping,
        discountedShipping,
        sumTaxAmount(order.shippingLine.taxLines),
        discountedShipping,
        vatRatePercent,
        false
      )
    );
  }

  const totals =
    basis === "invoice"
      ? {
          subtotal: invoiceSubtotal,
          discount: invoiceDiscount,
          shipping: money(order.totalShippingPriceSet),
          vat: invoiceVat,
          gross: invoiceGross,
        }
      : (() => {
          // Pull totals straight from Shopify's own order-level aggregates rather than re-summing
          // rounded per-line values -- guarantees this matches Shopify Admin exactly (summing 83+
          // individually-rounded lines can drift a few CZK from the order's actual total).
          const discount = money(order.totalDiscountsSet);
          const subtotal = round2(money(order.subtotalPriceSet) + discount); // gross, before discount -- matches Admin's "Subtotal"
          return {
            subtotal,
            discount,
            shipping: money(order.totalShippingPriceSet),
            vat: money(order.totalTaxSet),
            gross: money(order.totalPriceSet),
          };
        })();

  return {
    orderName: order.name,
    issuedAt: formatCzDate(order.processedAt || order.createdAt),
    shippingMethod: order.shippingLine?.title ?? null,
    paymentMethod: paymentLabel(order.paymentGatewayNames),
    customerEmail: order.email ?? null,
    buyerLines,
    lines,
    totals,
  };
};

export const packingSlipFilename = (orderName: string) =>
  `dodaci-list-${String(orderName).replace(/[^a-zA-Z0-9_-]+/g, "")}.pdf`;

const fontFile = (filename: string) => {
  const candidates = [
    path.join(__dirname, "../assets", filename),
    path.join(process.cwd(), "src/trabucco-fishing/assets", filename),
    path.join(__dirname, "../../../src/trabucco-fishing/assets", filename),
  ];
  const found = candidates.find((candidate) => fs.existsSync(candidate));
  if (!found) {
    throw new Error(`Missing PDF font ${filename}`);
  }
  return found;
};

type Align = "left" | "right";
const COLUMNS: { key: string; label: string; width: number; align: Align }[] = [
  { key: "item", label: "Položky zásilky", width: 200, align: "left" },
  { key: "ean", label: "EAN", width: 78, align: "left" },
  { key: "qty", label: "Množství", width: 40, align: "right" },
  { key: "dmoc", label: "DMOC vč. DPH", width: 62, align: "right" },
  { key: "unit", label: "Cena za m. j.", width: 62, align: "right" },
  { key: "discount", label: "Sleva", width: 38, align: "right" },
  { key: "after", label: "Cena po slevě", width: 62, align: "right" },
  { key: "net", label: "Cena", width: 62, align: "right" },
  { key: "vatPct", label: "DPH %", width: 36, align: "right" },
  { key: "vat", label: "DPH", width: 56, align: "right" },
  { key: "gross", label: "Celková cena vč. DPH", width: 78, align: "right" },
];

const BOX_TEXT_TOP = 20; // space reserved for the title above the body text
const BOX_BOTTOM_PADDING = 8;

const boxHeightFor = (doc: PDFKit.PDFDocument, w: number, lines: string[]): number => {
  const bodyHeight = doc.font("Roboto").fontSize(9).heightOfString(lines.join("\n"), { width: w - 16 });
  return BOX_TEXT_TOP + bodyHeight + BOX_BOTTOM_PADDING;
};

const drawBoxed = (doc: PDFKit.PDFDocument, x: number, y: number, w: number, h: number, title: string, lines: string[]) => {
  doc.rect(x, y, w, h).strokeColor("#222").lineWidth(0.6).stroke();
  doc.font("Roboto-Bold").fontSize(8).fillColor("#555").text(title.toUpperCase(), x + 8, y + 6, { width: w - 16 });
  doc.font("Roboto").fontSize(9).fillColor("#111").text(lines.join("\n"), x + 8, y + BOX_TEXT_TOP, { width: w - 16 });
};

export const buildPackingSlipPdf = (note: PackingSlip): Promise<Buffer> =>
  new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", layout: "landscape", margin: 28, info: { Title: `Dodací list ${note.orderName}` } });
    const chunks: Uint8Array[] = [];
    doc.on("data", (chunk: Uint8Array) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    doc.registerFont("Roboto", fontFile("Roboto-Regular.ttf"));
    doc.registerFont("Roboto-Bold", fontFile("Roboto-Bold.ttf"));

    const left = doc.page.margins.left;
    const top = doc.page.margins.top;
    const contentWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    doc.font("Roboto-Bold").fontSize(20).fillColor("#111").text("DODACÍ LIST", left, top, { continued: false });
    doc.font("Roboto").fontSize(10).fillColor("#555").text(`${TRABUCCO_SELLER.brand}  ·  ${note.orderName}`, left, top + 26);

    const metaY = top + 48;
    const metaW = (contentWidth - 16) / 3;
    [
      ["Datum zdanitelného plnění", note.issuedAt],
      ["Doprava", note.shippingMethod || "—"],
      ["Způsob platby", note.paymentMethod || "—"],
    ].forEach(([label, value], index) => {
      const x = left + index * (metaW + 8);
      doc.rect(x, metaY, metaW, 36).strokeColor("#ddd").lineWidth(0.6).stroke();
      doc.font("Roboto-Bold").fontSize(7).fillColor("#555").text(label.toUpperCase(), x + 8, metaY + 6, { width: metaW - 16 });
      doc.font("Roboto").fontSize(11).fillColor("#111").text(value, x + 8, metaY + 18, { width: metaW - 16 });
    });

    const partyY = metaY + 48;
    const partyW = (contentWidth - 12) / 2;
    const sellerLines = [
      TRABUCCO_SELLER.name,
      ...TRABUCCO_SELLER.addressLines,
      `IČO: ${TRABUCCO_SELLER.ico}  ·  DIČ: ${TRABUCCO_SELLER.dic}`,
      TRABUCCO_SELLER.web,
      `Výdej: ${TRABUCCO_SELLER.warehouse}`,
    ];
    const partyH = Math.max(92, boxHeightFor(doc, partyW, sellerLines), boxHeightFor(doc, partyW, note.buyerLines));
    drawBoxed(doc, left, partyY, partyW, partyH, "Dodavatel", sellerLines);
    drawBoxed(doc, left + partyW + 12, partyY, partyW, partyH, "Odběratel", note.buyerLines);

    const tableWidth = COLUMNS.reduce((sum, column) => sum + column.width, 0);
    let tableY = partyY + partyH + 16;
    const drawHeader = (y: number) => {
      doc.rect(left, y, tableWidth, 22).fillColor("#111").fill();
      let x = left;
      COLUMNS.forEach((column) => {
        doc.font("Roboto-Bold").fontSize(7).fillColor("#fff").text(column.label, x + 4, y + 7, {
          width: column.width - 8,
          align: column.align,
        });
        x += column.width;
      });
      return y + 22;
    };

    tableY = drawHeader(tableY);

    const ensureSpace = (needed: number) => {
      if (tableY + needed < doc.page.height - doc.page.margins.bottom - 70) return;
      doc.addPage({ size: "A4", layout: "landscape", margin: 28 });
      tableY = doc.page.margins.top;
      tableY = drawHeader(tableY);
    };

    note.lines.forEach((line, index) => {
      const itemText = line.sku ? `${line.name}\nKód: ${line.sku}` : line.name;
      // Measure with Roboto-Bold, matching the font the item name is actually rendered in below --
      // bold glyphs are wider than regular ones, so measuring with the regular font can underestimate
      // how many lines a long name wraps to and understate the row height, causing the next row to
      // overlap this one's last line (its "Kód: ..." line in particular).
      const rowHeight = Math.max(28, doc.font("Roboto-Bold").fontSize(8).heightOfString(itemText, { width: COLUMNS[0].width - 8 }) + 12);
      ensureSpace(rowHeight);
      if (index % 2 === 1) {
        doc.rect(left, tableY, tableWidth, rowHeight).fillColor("#f4f4f4").fill();
      }
      const cells = [
        itemText,
        line.ean ?? "",
        line.quantityLabel,
        line.dmoc != null ? formatCzkWhole(line.dmoc) : "",
        formatCzk(line.unitNet),
        formatPercent(line.discountPercent),
        formatCzk(line.unitNetAfterDiscount),
        formatCzk(line.lineNet),
        formatPercent(line.vatPercent),
        formatCzk(line.vatAmount),
        formatCzk(line.lineGross),
      ];
      let x = left;
      COLUMNS.forEach((column, columnIndex) => {
        doc
          .font(columnIndex === 0 ? "Roboto-Bold" : "Roboto")
          .fontSize(8)
          .fillColor("#111")
          .text(cells[columnIndex], x + 4, tableY + 6, { width: column.width - 8, align: column.align });
        x += column.width;
      });
      doc
        .moveTo(left, tableY + rowHeight)
        .lineTo(left + tableWidth, tableY + rowHeight)
        .strokeColor("#ddd")
        .lineWidth(0.4)
        .stroke();
      tableY += rowHeight;
    });

    ensureSpace(90);
    const totalsX = left + tableWidth - 260;
    tableY += 10;
    const totalRows: [string, string, boolean][] = [
      ["Mezisoučet (bez slevy)", formatCzk(note.totals.subtotal), false],
      ...(note.totals.discount > 0 ? ([["Sleva", `-${formatCzk(note.totals.discount)}`, false]] as [string, string, boolean][]) : []),
      ...(note.totals.shipping > 0 ? ([["Doprava", formatCzk(note.totals.shipping), false]] as [string, string, boolean][]) : []),
      ["DPH", formatCzk(note.totals.vat), false],
      ["Celkem vč. DPH", formatCzk(note.totals.gross), true],
    ];
    totalRows.forEach(([label, value, emph]) => {
      doc.font(emph ? "Roboto-Bold" : "Roboto").fontSize(emph ? 11 : 9).fillColor("#111");
      doc.text(label, totalsX, tableY, { width: 140 });
      doc.text(value, totalsX + 140, tableY, { width: 120, align: "right" });
      tableY += emph ? 18 : 16;
    });

    const signY = Math.max(tableY + 28, doc.page.height - doc.page.margins.bottom - 48);
    const signW = (contentWidth - 40) / 2;
    doc.moveTo(left, signY).lineTo(left + signW, signY).strokeColor("#111").lineWidth(0.6).stroke();
    doc.moveTo(left + signW + 40, signY).lineTo(left + contentWidth, signY).stroke();
    doc.font("Roboto").fontSize(8).fillColor("#555");
    doc.text("Vystavil / razítko dodavatele", left, signY + 6, { width: signW });
    doc.text("Převzal / razítko odběratele", left + signW + 40, signY + 6, { width: signW });

    doc.end();
  });
