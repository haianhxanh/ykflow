import { Request, Response } from "express";
import dotenv from "dotenv";
import { GraphQLClient } from "graphql-request";
import { ordersQuery } from "../queries/orders";
import ExcelJS from "exceljs";
import { ALLERGENS } from "../utils/constants";
import { sendNotification } from "../utils/notification";

dotenv.config();
const { ACCESS_TOKEN, STORE, API_VERSION, ORDER_EXPORT_RECIPIENTS } =
  process.env;
const recipientEmails = ORDER_EXPORT_RECIPIENTS as string;

/*-------------------------------------MAIN FUNCTION------------------------------------------------*/

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
    // yesterday = "2024-11-28";

    const latestOrders = await client.request(ordersQuery, {
      query: `(created_at:'${yesterday}' AND financial_status:'paid') OR tag:'Zaplaceno ${yesterday}'`,
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`Objednávky ${yesterday}`);

    for (const [orderIndex, order] of latestOrders.orders.edges.entries()) {
      let severeAllergic = order.node.customAttributes.find((attr: any) => {
        return attr.key == "Jsem prudký alergik" && attr.value == "Ano";
      });
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
          { header: "Prudký alergik", key: "severeAllergic", width: 10 },
        ];
        ALLERGENS.split(",").forEach((allergen) => {
          header.push({ header: allergen, key: allergen, width: 10 });
        });
        worksheet.columns = header;
      }

      let oneTypeOrder =
        order.node.lineItems.edges.every((line: any) => {
          return line.node.variant.product.tags.includes("Programy");
        }) ||
        order.node.lineItems.edges.every((line: any) => {
          return !line.node.variant.product.tags.includes("Programy");
        }) ||
        false;

      let mixedOrder = oneTypeOrder ? false : true;

      let programsItems = order.node.lineItems.edges.filter((line: any) => {
        return line.node.variant.product.tags.includes("Programy");
      });
      let nonProgramItems = order.node.lineItems.edges.filter((line: any) => {
        return !line.node.variant.product.tags.includes("Programy");
      });

      let mainItems = [];
      if (oneTypeOrder) {
        if (programsItems.length > 0) {
          mainItems = programsItems;
        } else if (nonProgramItems.length > 0) {
          mainItems = nonProgramItems;
        }
      } else {
        mainItems = programsItems;
      }

      let secondaryItems = order.node.lineItems.edges.filter((line: any) => {
        return !mainItems.includes(line);
      });

      let addons = [];
      let promo = [];

      if (mixedOrder) {
        for (const [lineIndex, line] of secondaryItems.entries()) {
          if (
            line.node.originalTotalSet.shopMoney.amount -
              line.node.totalDiscountSet.shopMoney.amount >
            0
          ) {
            addons.push(line);
          } else {
            promo.push(line);
          }
        }
      }

      for (const [lineIndex, line] of mainItems.entries()) {
        let programStartDate, programEndDate;
        let lineIsProgram =
          line?.node?.variant?.product?.tags?.includes("Programy");
        let lineQuantity = line.node.quantity;
        let promoField;
        let addonsField;

        for (let i = 0; i < lineQuantity; i++) {
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

          if (lineIndex == 0 && mixedOrder) {
            if (promo.length > 0)
              promoField = promo
                .map((item: any) => {
                  return `${item.node.quantity} x ${item.node.title}`;
                })
                .join("\n");
            if (addons.length > 0)
              addonsField = addons
                .map((item: any) => {
                  return `${item.node.quantity} x ${item.node.title}`;
                })
                .join("\n");
          }

          let shippingAddress;
          if (
            order.node?.shippingAddress?.address1 &&
            !order.node?.shippingAddress?.address2
          ) {
            shippingAddress = order.node?.shippingAddress?.address1;
          } else if (
            order.node?.shippingAddress?.address1 &&
            order.node?.shippingAddress?.address2
          ) {
            shippingAddress = `${order.node?.shippingAddress?.address1} ${order.node?.shippingAddress?.address2}`;
          }

          const row = [
            order.node?.name,
            order.node?.displayFinancialStatus,
            order.node?.billingAddress?.name,
            order.node?.shippingAddress?.name || "",
            order.node?.shippingAddress?.company || "",
            order.node?.shippingAddress?.phone ||
              order.node?.billingAddress?.phone ||
              "",
            shippingAddress ||
              `Pickup ${order.node?.shippingLine?.title}` ||
              "",
            order.node?.shippingAddress?.city || "",
            order.node?.shippingAddress?.zip || "",
            order.node?.note,
            customAttributes?.join("\n"),
            addonsField ? addonsField : "",
            promoField ? promoField : "",
            programStartDate,
            programEndDate,
            line.node.title,
            lineIsProgram
              ? line.node?.title?.split(" | ")[1]?.replace(" kcal", "")
              : "",
            severeAllergic ? "Ano" : "",
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
                    row.push(cell.value);
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
    }
    // return res.status(200).json(latestOrders);
    await workbook.xlsx.writeFile(`orders-${yesterday}.xlsx`);
    const buffer = await workbook.xlsx.writeBuffer();
    const base64Content = Buffer.from(buffer).toString("base64");

    let attachment = {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      name: `orders-${yesterday}.xlsx`,
      content: base64Content,
    };

    const sendEmail = await sendNotification(
      `Objednávky ${yesterday}`,
      recipientEmails,
      `Objednávky ze dne ${yesterday} jsou připraveny k exportu`,
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
