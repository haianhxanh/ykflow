import { Request, Response } from "express";
import dotenv from "dotenv";
import { GraphQLClient } from "graphql-request";
import { allOrdersQuery } from "../../queries/orders";
import { upsellDetails } from "./upsell_details";
import exceljs from "exceljs";
import { variantByIdQuery, variantsByQuery } from "../../queries/variants";
dotenv.config();
const { ACCESS_TOKEN, STORE, API_VERSION } = process.env;

/*-------------------------------------MAIN FUNCTION------------------------------------------------*/

export const programs = async (req: Request, res: Response) => {
  try {
    const client = new GraphQLClient(`https://${STORE}/admin/api/${API_VERSION}/graphql.json`, {
      // @ts-ignore
      headers: {
        "X-Shopify-Access-Token": ACCESS_TOKEN,
      },
    });

    const workbook = new exceljs.Workbook();
    const worksheet = workbook.addWorksheet("Sheet1");

    const allOrders = await allOrdersQuery("created_at:>=2025-10-31 AND created_at:<=2026-01-31");

    // const firstOrder = allOrders[0].node;

    for (const [index, order] of allOrders.entries()) {
      const orderHasProgram = order.node.lineItems.edges.some((item: any) => item.node.variant.product?.tags?.includes("Programy"));
      if (!orderHasProgram) continue;
      const programItems = order.node.lineItems.edges.filter((item: any) => item.node.variant.product?.tags?.includes("Programy"));
      // return res.status(200).json({ programItems });
      let isFirstRowOfOrder = true;
      for (const programItem of programItems) {
        const orderName = order.node.name;
        const orderCreatedAt = order.node.createdAt.split("T")[0];
        const programStartDate = order.node.customAttributes.find((attr: any) => attr.key == "Datum začátku Yes Krabiček")?.value;
        const programStartDateParts = programStartDate?.split("-");
        const programStartDateFormatted = programStartDateParts
          ? `${programStartDateParts[2]}-${programStartDateParts[1]}-${programStartDateParts[0]}`
          : programStartDate;
        const programLength = programItem.node.variant.sku.split("D")[0];
        const programType = programItem.node.variant.sku.split("D")[1];
        const orderTotal = order.node.originalTotalPriceSet.shopMoney.amount;
        const discount = order.node.totalDiscountsSet.shopMoney.amount;
        const shipping = order.node.totalShippingPriceSet.shopMoney.amount;
        const quantity = programItem.node.quantity;
        const note = order.node.note;

        for (let q = 0; q < quantity; q++) {
          if (isFirstRowOfOrder) {
            worksheet.addRow([orderName, orderCreatedAt, orderTotal, discount, shipping, programType, programStartDateFormatted, programLength, note]);
            isFirstRowOfOrder = false;
          } else {
            worksheet.addRow([orderName, "", "", "", "", programType, programStartDateFormatted, programLength, note]);
          }
        }
      }
    }

    await workbook.xlsx.writeFile(`programs-export-${new Date().getTime()}.xlsx`);
    return res.status(200).json({ message: "Programs exported successfully" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
