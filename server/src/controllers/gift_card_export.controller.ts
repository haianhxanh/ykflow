import { Request, Response } from "express";
import dotenv from "dotenv";
import { allGiftCardsQuery, allOrdersQuery, ordersQuery } from "../queries/orders";
import ExcelJS from "exceljs";

dotenv.config();
const { ACCESS_TOKEN, STORE, API_VERSION } = process.env;

/*-------------------------------------MAIN FUNCTION------------------------------------------------*/

export const gift_card_export = async (req: Request, res: Response) => {
  const giftCards = await allGiftCardsQuery("created_at:>=2025-01-01");
  // const ordersPaidWithGiftCards = await allOrdersQuery("gateway:gift_card AND created_at:>=2025-01-01");
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(`giftcards`);
  worksheet.columns = [
    { header: "ID", key: "id", width: 10 },
    { header: "Created At", key: "createdAt", width: 10 },
    { header: "Order", key: "order", width: 10 },
    { header: "Initial Value", key: "initialValue", width: 10 },
  ];
  for (const giftCard of giftCards) {
    worksheet.addRow({
      id: giftCard.node.id,
      createdAt: giftCard.node.createdAt,
      order: giftCard.node.order?.name || "N/A",
      initialValue: giftCard.node.initialValue.amount,
    });
  }
  workbook.xlsx.writeFile(`giftcards.xlsx`);
  return res.status(200).json({ giftCards });
};

const getYesterday = () => {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date.toISOString().split("T")[0];
};
