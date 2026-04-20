import { Request, Response } from "express";
import dotenv from "dotenv";
import { allOrdersQuery } from "../../queries/orders";
import exceljs from "exceljs";
dotenv.config();

const FREE_PAN_SKU = "NPFABINIPANEVGIFT";

export const npfabinipanevgift_report = async (req: Request, res: Response) => {
  try {
    const allOrders = await allOrdersQuery("created_at:>=2026-04-03 AND created_at:<2026-04-07");

    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet("Sheet1");

    worksheet.addRow(["Order #", "Order Value", "Free Pans Count"]);

    for (const order of allOrders) {
      const node = order.node;
      const lineItems = node.lineItems.edges;

      const freePanItems = lineItems.filter((item: any) => item.node.variant?.sku === FREE_PAN_SKU);
      if (freePanItems.length === 0) continue;

      const freePanCount = freePanItems.reduce((sum: number, item: any) => sum + item.node.quantity, 0);

      worksheet.addRow([node.name, node.originalTotalPriceSet.shopMoney.amount, freePanCount]);
    }

    await workbook.xlsx.writeFile(`npfabinipanevgift-report-${new Date().getTime()}.xlsx`);
    return res.status(200).json({ message: "Export successful" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
