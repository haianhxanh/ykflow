import { Request, Response } from "express";
import ExcelJS from "exceljs";
import { allGiftCardsQuery } from "../queries/orders";

type GiftCardNode = {
  id: string;
  createdAt: string;
  order?: { name?: string } | null;
  initialValue?: { amount?: string } | null;
  balance?: { amount?: string } | null;
};

const giftCardAdminBaseUrl = "https://admin.shopify.com/store/yes-krabicky/gift_cards";

export const gift_card_balance_report = async (req: Request, res: Response) => {
  try {
    const asOfDate = (req.query.asOf as string) || "2025-12-31";
    const createdFrom = (req.query.createdFrom as string) || "2025-01-01";
    const includeXlsx = (req.query.format as string) === "xlsx";

    const createdBefore = `${asOfDate}T23:59:59Z`;
    const query = `created_at:>=${createdFrom} AND created_at:<=${createdBefore}`;
    const giftCards = await allGiftCardsQuery(query);

    const processed = giftCards
      .map((giftCard) => giftCard.node as GiftCardNode)
      .filter((giftCard) => new Date(giftCard.createdAt) <= new Date(createdBefore))
      .map((giftCard) => {
        const initialValue = Number(giftCard.initialValue?.amount || 0);
        const balance = Number(giftCard.balance?.amount || 0);
        const giftCardNumericId = giftCard.id.split("/").pop();

        return {
          url: giftCardNumericId ? `${giftCardAdminBaseUrl}/${giftCardNumericId}` : giftCard.id,
          createdAt: giftCard.createdAt,
          order: giftCard.order?.name || "N/A",
          initialValue,
          balance,
        };
      });

    const allUnspentTotal = processed.reduce((acc, giftCard) => acc + giftCard.balance, 0);

    const summary = {
      asOf: asOfDate,
      createdFrom,
      allUnspentTotal: Number(allUnspentTotal.toFixed(2)),
      count: processed.length,
      dphNote: "Gift card values are nominal balances and do not represent VAT split (with/without VAT).",
    };

    if (!includeXlsx) {
      return res.status(200).json({ summary, giftCards: processed });
    }

    const workbook = new ExcelJS.Workbook();

    const summarySheet = workbook.addWorksheet("summary");
    summarySheet.columns = [
      { header: "Metoda", key: "metric", width: 45 },
      { header: "Hodnota", key: "value", width: 30 },
    ];
    summarySheet.addRows([
      { metric: "Stav k datu", value: summary.asOf },
      { metric: "Vytvoreno od", value: summary.createdFrom },
      { metric: "Nevycerpane poukazy celkem", value: summary.allUnspentTotal },
      { metric: "Pocet poukazu", value: summary.count },
      { metric: "Poznamka k DPH", value: summary.dphNote },
    ]);

    const detailSheet = workbook.addWorksheet("giftcards");
    detailSheet.columns = [
      { header: "URL", key: "url", width: 60 },
      { header: "Vytvoreno", key: "createdAt", width: 24 },
      { header: "Objednavka", key: "order", width: 20 },
      { header: "Pocatecni hodnota", key: "initialValue", width: 18 },
      { header: "Zustatek", key: "balance", width: 14 },
    ];
    detailSheet.addRows(processed);

    const fileName = `giftcards-balance-report-${asOfDate}.xlsx`;
    await workbook.xlsx.writeFile(fileName);
    const buffer = await workbook.xlsx.writeBuffer();
    const base64Content = Buffer.from(buffer).toString("base64");
    const attachment = {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      name: fileName,
      content: base64Content,
    };

    return res.status(200).json({ summary, attachment });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
