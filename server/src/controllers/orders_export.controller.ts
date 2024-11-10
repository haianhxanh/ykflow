import { Request, Response } from "express";
import dotenv from "dotenv";
import { GraphQLClient } from "graphql-request";
import { ordersQuery } from "../queries/orders";
import xlsx from "xlsx";
import ExcelJS from "exceljs";
import { Workbook, Worksheet, Column, Cell } from "exceljs";
import { ALLERGENS } from "../utils/constants";
import { sendNotification } from "../utils/notification";

dotenv.config();
const { ACCESS_TOKEN, STORE, API_VERSION } = process.env;

/*-------------------------------------GET INQUIRIES FROM DATABASE------------------------------------------------*/

export const orders_export = async (req: Request, res: Response) => {
  try {
    const client = new GraphQLClient(
      `https://${STORE}/admin/api/${API_VERSION}/graphql.json`,
      {
        // @ts-ignore
        headers: {
          "X-Shopify-Access-Token": ACCESS_TOKEN,
        },
      }
    );

    let yesterday = getYesterday();

    const latestOrders = await client.request(ordersQuery, {
      query: `created_at:'${yesterday}'`,
    });

    // return res.status(200).json(latestOrders);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`Objednávky ${yesterday}`);

    for (const [orderIndex, order] of latestOrders.orders.edges.entries()) {
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
        ];
        ALLERGENS.split(",").forEach((allergen) => {
          header.push({ header: allergen, key: allergen, width: 10 });
        });
        worksheet.columns = header;
      }
      for (const [lineIndex, line] of order.node.lineItems.edges.entries()) {
        let programStartDate, programEndDate;
        let lineIsProgram =
          line?.node?.variant?.product?.tags?.includes("Programy");
        if (lineIsProgram && order.node.customAttributes) {
          for (const attribute of order.node.customAttributes) {
            if (attribute.key === "Datum začátku Yes Krabiček") {
              programStartDate = attribute.value;
            }
            if (
              attribute.key ===
              `Konec_${line.node?.variant?.id?.replace(
                "gid://shopify/ProductVariant/",
                ""
              )}`
            ) {
              programEndDate = attribute.value;
            }
          }
        }
        let customAttributes = order.node?.customAttributes?.map(
          (attr: any) => {
            return `${attr.key}: ${attr.value}`;
          }
        );
        const row = [
          order.node?.name,
          order.node?.displayFinancialStatus,
          order.node?.billingAddress?.name,
          order.node?.shippingAddress?.name,
          order.node?.shippingAddress?.company,
          order.node?.shippingAddress?.phone,
          order.node?.shippingAddress?.address1,
          order.node?.shippingAddress?.city,
          order.node?.shippingAddress?.zip,
          order.node?.note,
          customAttributes?.join("\n"),
          "",
          "",
          programStartDate,
          programEndDate,
          line.node.title,
          lineIsProgram
            ? line.node?.title?.split(" | ")[1]?.replace(" kcal", "")
            : "",
        ];
        if (lineIsProgram) {
          let allergens = line.node?.customAttributes?.find(
            (attr: any) => attr.key == "Alergeny" && attr.value != ""
          );
          if (allergens) {
            allergens = allergens.value
              .split(",")
              .map((allergen: string) => allergen.trim());

            const firstRow = worksheet.getRow(1);

            firstRow.eachCell((cell, colNumber) => {
              if (colNumber > 17) {
                if (allergens.includes(cell.value)) {
                  row.push("X");
                } else {
                  row.push("");
                }
              }
            });
          }
        }
        worksheet.addRow(row);
      }
    }

    await workbook.xlsx.writeFile("orders.xlsx");
    // return res.status(200).json(latestOrders);
    const buffer = await workbook.xlsx.writeBuffer();
    const base64Content = Buffer.from(buffer).toString("base64");

    let attachment = {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      name: `orders-${yesterday}.xlsx`,
      content: base64Content,
    };
    const sendEmail = await sendNotification(
      `Objednávky ${yesterday}`,
      "upgrowthdev@gmail.com",
      "Objednávky jsou připraveny k exportu",
      false,
      attachment
    );
    return res.status(200).json(sendEmail);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const getYesterday = () => {
  const date = new Date();
  date.setDate(date.getDate() - 1);
  return date.toISOString().split("T")[0];
};
