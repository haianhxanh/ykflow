"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildPackingSlipPdf = exports.packingSlipFilename = exports.mapOrderToPackingSlip = exports.TRABUCCO_SELLER = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const pdfkit_1 = __importDefault(require("pdfkit"));
const DEFAULT_VAT_RATE = 0.21;
const REDUCED_VAT_RATE = 0.12;
exports.TRABUCCO_SELLER = {
    name: "SR TRADING, s.r.o.",
    brand: "Trabucco Fish",
    addressLines: ["Rybná 716/24", "110 00 Praha 1"],
    ico: "03676161",
    dic: "CZ03676161",
    warehouse: "Ke Kablu 683/3, 102 00 Praha-Dolní Měcholupy",
    web: "www.trabuccofish.cz",
};
const money = (bag) => { var _a; var _b; return parseFloat((_b = (_a = bag === null || bag === void 0 ? void 0 : bag.shopMoney) === null || _a === void 0 ? void 0 : _a.amount) !== null && _b !== void 0 ? _b : "0") || 0; };
const round2 = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
const sumDiscountAllocations = (allocations) => round2((allocations !== null && allocations !== void 0 ? allocations : []).reduce((sum, a) => sum + money(a.allocatedAmountSet), 0));
const formatCzk = (n) => new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK" }).format(n);
const formatCzkWhole = (n) => new Intl.NumberFormat("cs-CZ", { style: "currency", currency: "CZK", maximumFractionDigits: 0 }).format(n);
const formatPercent = (n) => {
    const shown = Math.abs(n - Math.round(n)) < 0.05 ? String(Math.round(n)) : n.toFixed(1).replace(".", ",");
    return `${shown} %`;
};
const formatCzDate = (iso) => new Intl.DateTimeFormat("cs-CZ", {
    timeZone: "Europe/Prague",
    day: "numeric",
    month: "numeric",
    year: "numeric",
}).format(new Date(iso));
const compactAddress = (address) => {
    if (!address)
        return [];
    return [address.company, address.address1, address.address2, [address.zip, address.city].filter(Boolean).join(" "), address.country].filter((part) => Boolean(part && String(part).trim()));
};
const vatRateFrom = (taxLines) => {
    const first = taxLines === null || taxLines === void 0 ? void 0 : taxLines[0];
    if (typeof (first === null || first === void 0 ? void 0 : first.rate) === "number" && first.rate > 0)
        return first.rate;
    if (typeof (first === null || first === void 0 ? void 0 : first.ratePercentage) === "number" && first.ratePercentage > 0)
        return first.ratePercentage / 100;
    return DEFAULT_VAT_RATE;
};
const paymentLabel = (gatewayNames) => {
    if (!(gatewayNames === null || gatewayNames === void 0 ? void 0 : gatewayNames.length))
        return "Neuvedeno";
    if (gatewayNames.some((name) => /manual|bank|invoice|faktura|převod|prevod|deposit/i.test(name))) {
        return "Platba na fakturu";
    }
    return gatewayNames.join(", ");
};
const sumTaxAmount = (taxLines) => round2((taxLines !== null && taxLines !== void 0 ? taxLines : []).reduce((sum, t) => sum + money(t.priceSet), 0));
// Built directly from Shopify's own already-computed line-level totals (originalTotal,
// discountedTotal, and the actual taxLines amount) instead of taking a per-unit price and
// multiplying it out to the quantity. That per-unit approach rounds the unit price to 2
// decimals *before* multiplying by quantity, which on a qty-20 line can drift the total by
// up to 20x the per-unit rounding error (e.g. a SKU that should total 975.84 came out as
// 975.80 -- small on one line, but it doesn't match Shopify, and compounds across the order).
const pricedLine = (name, sku, quantity, quantityLabel, originalTotal, discountedTotal, taxAmount, vatRatePercent, taxesIncluded) => {
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
const mapOrderToPackingSlip = (order, basis = "shopify") => {
    var _a, _b, _c, _d, _e, _f, _g;
    var _h, _j, _k, _l;
    const taxesIncluded = Boolean(order.taxesIncluded);
    const shippingAddress = order.shippingAddress;
    const billingAddress = order.billingAddress;
    const buyerLines = compactAddress(shippingAddress).length ? compactAddress(shippingAddress) : compactAddress(billingAddress);
    const companyName = (_b = (_a = order.purchasingEntity) === null || _a === void 0 ? void 0 : _a.company) === null || _b === void 0 ? void 0 : _b.name;
    if (companyName && !buyerLines.some((line) => line.trim().toLowerCase() === companyName.trim().toLowerCase())) {
        buyerLines.unshift(companyName);
    }
    const attrs = (_h = order.customAttributes) !== null && _h !== void 0 ? _h : [];
    const ico = (_c = attrs.find((a) => { var _a; return ((_a = a.key) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === "ico"; })) === null || _c === void 0 ? void 0 : _c.value;
    const dic = (_d = attrs.find((a) => { var _a; return ((_a = a.key) === null || _a === void 0 ? void 0 : _a.toLowerCase()) === "dic"; })) === null || _d === void 0 ? void 0 : _d.value;
    if (ico || dic) {
        buyerLines.push([ico && `IČO: ${ico}`, dic && `DIČ: ${dic}`].filter(Boolean).join("  ·  "));
    }
    if (order.email)
        buyerLines.push(order.email);
    const phone = (shippingAddress === null || shippingAddress === void 0 ? void 0 : shippingAddress.phone) || (billingAddress === null || billingAddress === void 0 ? void 0 : billingAddress.phone) || order.phone;
    if (phone)
        buyerLines.push(phone);
    // Only populated/used in basis="invoice" mode -- totals are summed from the reconstructed
    // lines below instead of pulled from Shopify's (correct) order-level aggregates, since those
    // aggregates don't match the already-sent invoice this mode is replicating.
    let invoiceSubtotal = 0;
    let invoiceDiscount = 0;
    let invoiceVat = 0;
    let invoiceGross = 0;
    const buildLine = (name, sku, qty, quantityLabel, originalTotal, shopifyDiscountedTotal, shopifyTaxAmount, unitDiscounted, vatRatePercent, includeInSubtotal) => {
        let discountedTotal = shopifyDiscountedTotal;
        let taxAmount = shopifyTaxAmount;
        if (basis === "invoice") {
            // Replicates the Fakturoid bridge's own math for the invoice already sent: per-unit
            // discounted price (which Shopify truncates, not rounds, to 2 decimals) multiplied out
            // to quantity, then VAT computed as the base row's VAT minus the discount row's VAT --
            // matching the invoice's two-rows-per-item layout, each independently rounded.
            discountedTotal = round2((unitDiscounted !== null && unitDiscounted !== void 0 ? unitDiscounted : shopifyDiscountedTotal / (qty || 1)) * qty);
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
    const lines = ((_j = (_e = order.lineItems) === null || _e === void 0 ? void 0 : _e.edges) !== null && _j !== void 0 ? _j : [])
        .map((edge) => edge.node)
        .filter((node) => { var _a; return ((_a = node.currentQuantity) !== null && _a !== void 0 ? _a : 0) > 0; })
        .map((node) => {
        var _a, _b, _c, _d;
        var _e;
        const qty = node.currentQuantity;
        // Custom items (no variant) have no known retail price, so DMOC is left blank for them.
        const variantPrice = node.variant ? parseFloat((_e = node.variant.price) !== null && _e !== void 0 ? _e : "") : NaN;
        const retailVatRate = ((_b = (_a = node.variant) === null || _a === void 0 ? void 0 : _a.product) === null || _b === void 0 ? void 0 : _b.inCollection) ? REDUCED_VAT_RATE : DEFAULT_VAT_RATE;
        const vatRatePercent = round2(vatRateFrom(node.taxLines) * 100);
        const originalTotal = money(node.originalTotalSet);
        const discountedTotal = round2(originalTotal - sumDiscountAllocations(node.discountAllocations));
        const line = buildLine(node.name || node.title, node.sku || ((_c = node.variant) === null || _c === void 0 ? void 0 : _c.sku) || null, qty, `${qty} ks`, originalTotal, discountedTotal, sumTaxAmount(node.taxLines), money(node.discountedUnitPriceAfterAllDiscountsSet), vatRatePercent, true);
        return Object.assign(Object.assign({}, line), { ean: ((_d = node.variant) === null || _d === void 0 ? void 0 : _d.barcode) || null, dmoc: Number.isFinite(variantPrice) ? Math.round(variantPrice * (1 + retailVatRate)) : null });
    });
    if ((_f = order.shippingLine) === null || _f === void 0 ? void 0 : _f.title) {
        const vatRatePercent = round2(vatRateFrom(order.shippingLine.taxLines) * 100);
        const originalShipping = money(order.shippingLine.originalPriceSet);
        const discountedShipping = round2(originalShipping - sumDiscountAllocations(order.shippingLine.discountAllocations));
        lines.push(buildLine(order.shippingLine.title, null, 1, "1", originalShipping, discountedShipping, sumTaxAmount(order.shippingLine.taxLines), discountedShipping, vatRatePercent, false));
    }
    const totals = basis === "invoice"
        ? {
            subtotal: invoiceSubtotal,
            discount: invoiceDiscount,
            shipping: money(order.currentShippingPriceSet),
            vat: invoiceVat,
            gross: invoiceGross,
        }
        : (() => {
            // Pull totals straight from Shopify's own order-level aggregates rather than re-summing
            // rounded per-line values -- guarantees this matches Shopify Admin exactly (summing 83+
            // individually-rounded lines can drift a few CZK from the order's actual total).
            const discount = money(order.currentTotalDiscountsSet);
            const subtotal = round2(money(order.currentSubtotalPriceSet) + discount); // gross, before discount -- matches Admin's "Subtotal"
            return {
                subtotal,
                discount,
                shipping: money(order.currentShippingPriceSet),
                vat: money(order.currentTotalTaxSet),
                gross: money(order.currentTotalPriceSet),
            };
        })();
    return {
        orderName: order.name,
        issuedAt: formatCzDate(order.processedAt || order.createdAt),
        shippingMethod: (_k = (_g = order.shippingLine) === null || _g === void 0 ? void 0 : _g.title) !== null && _k !== void 0 ? _k : null,
        paymentMethod: paymentLabel(order.paymentGatewayNames),
        customerEmail: (_l = order.email) !== null && _l !== void 0 ? _l : null,
        buyerLines,
        lines,
        totals,
    };
};
exports.mapOrderToPackingSlip = mapOrderToPackingSlip;
const packingSlipFilename = (orderName) => `dodaci-list-${String(orderName).replace(/[^a-zA-Z0-9_-]+/g, "")}.pdf`;
exports.packingSlipFilename = packingSlipFilename;
const fontFile = (filename) => {
    const candidates = [
        path_1.default.join(__dirname, "../assets", filename),
        path_1.default.join(process.cwd(), "src/trabucco-fishing/assets", filename),
        path_1.default.join(__dirname, "../../../src/trabucco-fishing/assets", filename),
    ];
    const found = candidates.find((candidate) => fs_1.default.existsSync(candidate));
    if (!found) {
        throw new Error(`Missing PDF font ${filename}`);
    }
    return found;
};
const COLUMNS = [
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
const boxHeightFor = (doc, w, lines) => {
    const bodyHeight = doc.font("Roboto").fontSize(9).heightOfString(lines.join("\n"), { width: w - 16 });
    return BOX_TEXT_TOP + bodyHeight + BOX_BOTTOM_PADDING;
};
const drawBoxed = (doc, x, y, w, h, title, lines) => {
    doc.rect(x, y, w, h).strokeColor("#222").lineWidth(0.6).stroke();
    doc.font("Roboto-Bold").fontSize(8).fillColor("#555").text(title.toUpperCase(), x + 8, y + 6, { width: w - 16 });
    doc.font("Roboto").fontSize(9).fillColor("#111").text(lines.join("\n"), x + 8, y + BOX_TEXT_TOP, { width: w - 16 });
};
const buildPackingSlipPdf = (note) => new Promise((resolve, reject) => {
    const doc = new pdfkit_1.default({ size: "A4", layout: "landscape", margin: 28, info: { Title: `Dodací list ${note.orderName}` } });
    const chunks = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);
    doc.registerFont("Roboto", fontFile("Roboto-Regular.ttf"));
    doc.registerFont("Roboto-Bold", fontFile("Roboto-Bold.ttf"));
    const left = doc.page.margins.left;
    const top = doc.page.margins.top;
    const contentWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    doc.font("Roboto-Bold").fontSize(20).fillColor("#111").text("DODACÍ LIST", left, top, { continued: false });
    doc.font("Roboto").fontSize(10).fillColor("#555").text(`${exports.TRABUCCO_SELLER.brand}  ·  ${note.orderName}`, left, top + 26);
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
        exports.TRABUCCO_SELLER.name,
        ...exports.TRABUCCO_SELLER.addressLines,
        `IČO: ${exports.TRABUCCO_SELLER.ico}  ·  DIČ: ${exports.TRABUCCO_SELLER.dic}`,
        exports.TRABUCCO_SELLER.web,
        `Výdej: ${exports.TRABUCCO_SELLER.warehouse}`,
    ];
    const partyH = Math.max(92, boxHeightFor(doc, partyW, sellerLines), boxHeightFor(doc, partyW, note.buyerLines));
    drawBoxed(doc, left, partyY, partyW, partyH, "Dodavatel", sellerLines);
    drawBoxed(doc, left + partyW + 12, partyY, partyW, partyH, "Odběratel", note.buyerLines);
    const tableWidth = COLUMNS.reduce((sum, column) => sum + column.width, 0);
    let tableY = partyY + partyH + 16;
    const drawHeader = (y) => {
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
    const ensureSpace = (needed) => {
        if (tableY + needed < doc.page.height - doc.page.margins.bottom - 70)
            return;
        doc.addPage({ size: "A4", layout: "landscape", margin: 28 });
        tableY = doc.page.margins.top;
        tableY = drawHeader(tableY);
    };
    note.lines.forEach((line, index) => {
        var _a;
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
            (_a = line.ean) !== null && _a !== void 0 ? _a : "",
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
    const totalRows = [
        ["Mezisoučet (bez slevy)", formatCzk(note.totals.subtotal), false],
        ...(note.totals.discount > 0 ? [["Sleva", `-${formatCzk(note.totals.discount)}`, false]] : []),
        ...(note.totals.shipping > 0 ? [["Doprava", formatCzk(note.totals.shipping), false]] : []),
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
exports.buildPackingSlipPdf = buildPackingSlipPdf;
