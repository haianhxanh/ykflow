import { Request, Response } from "express";
import dotenv from "dotenv";
import { GraphQLClient } from "graphql-request";
import { ordersQuery } from "../queries/orders";
import ExcelJS from "exceljs";
import { ALLERGENS } from "../utils/constants";
import { sendNotification } from "../utils/notification";
import { convertDateToISOString, convertDateToLocalString, getFutureBusinessDate, setProgramLengthWord } from "../utils/helpers";
import { getShippingInstructions } from "../utils/orderExportHelper";
import { locationQueryByName } from "../queries/locations";

dotenv.config();
const { ACCESS_TOKEN, STORE, API_VERSION, ORDER_EXPORT_RECIPIENTS, MANDRILL_MESSAGE_BCC_ADDRESS_DEV } = process.env;
const recipientEmails = ORDER_EXPORT_RECIPIENTS as string;

/*-------------------------------------MAIN FUNCTION------------------------------------------------*/

export const orders_export = async (req: Request, res: Response) => {
  try {
    const client = new GraphQLClient(`https://${STORE}/admin/api/${API_VERSION}/graphql.json`, {
      // @ts-ignore
      headers: {
        "X-Shopify-Access-Token": ACCESS_TOKEN,
      },
    });

    const yesterday = req.query.date ? req.query.date : getYesterday();

    const latestOrders = await client.request(ordersQuery, {
      query: `(created_at:'${yesterday}')`,
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`Objednávky ${yesterday}`);

    const disallowedFinancialStatuses = ["VOIDED", "EXPIRED", "REFUNDED"];
    // const allowedPaymentMethods = ["Platba na fakturu", "shopify_payments", "paypal"];

    for (const [orderIndex, order] of latestOrders.orders.edges.entries()) {
      if (disallowedFinancialStatuses.includes(order.node?.displayFinancialStatus)) {
        continue;
      }
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
          { header: "Full Address", key: "fullAddress", width: 20 },
          { header: "Delivery Note", key: "shippingInstructions", width: 40 },
          { header: "Note", key: "note", width: 15 },
          { header: "Note Attributes", key: "noteAttributes", width: 15 },
          { header: "Doplňkový prodej", key: "addon", width: 15 },
          { header: "Promo", key: "promo", width: 15 },
          { header: "Start Date", key: "startDate", width: 15 },
          { header: "End Date", key: "endDate", width: 15 },
          { header: "Line Item Name", key: "lineItemName", width: 30 },
          { header: "Single Portions", key: "singlePortions", width: 15 },
          { header: "Program Length", key: "programLength", width: 10 },
          { header: "Kcal", key: "kcal", width: 10 },
          { header: "Prudký alergik", key: "severeAllergic", width: 10 },
        ];
        ALLERGENS.split(",").forEach((allergen) => {
          header.push({ header: allergen, key: allergen, width: 10 });
        });
        worksheet.columns = header;
      }

      const oneTypeOrder =
        order.node.lineItems.edges.every((line: any) => {
          return line.node.variant.product?.tags?.includes("Programy");
        }) ||
        order.node.lineItems.edges.every((line: any) => {
          return !line.node.variant.product?.tags?.includes("Programy");
        }) ||
        false;

      const mixedOrder = oneTypeOrder ? false : true;

      const programsItems = order.node.lineItems.edges.filter((line: any) => {
        return line.node.variant.product?.tags?.includes("Programy");
      });
      const nonProgramItems = order.node.lineItems.edges.filter((line: any) => {
        return !line.node.variant.product?.tags?.includes("Programy") && !line.node.variant.product?.tags?.includes("Monoporce");
      });

      let mainItems = [];
      let nonProgramOrder = false;
      if (oneTypeOrder) {
        if (programsItems.length > 0) {
          mainItems = programsItems;
        } else if (nonProgramItems.length > 0) {
          mainItems = nonProgramItems;
          nonProgramOrder = true;
        }
      } else {
        mainItems = programsItems;
      }

      let secondaryItems = order.node.lineItems.edges.filter((line: any) => {
        return !mainItems.includes(line);
      });

      let addons = [];
      let promo = [];
      let singlePortions = order.node.lineItems.edges.filter((line: any) => {
        return line.node.variant.product?.tags?.includes("Monoporce");
      });

      if (mixedOrder) {
        for (const [lineIndex, line] of secondaryItems.entries()) {
          if (line.node.variant.product?.tags?.includes("excluded-from-export") || line.node.variant.product?.tags?.includes("Monoporce")) {
            continue;
          }
          if (line.node.originalTotalSet.shopMoney.amount - line.node.totalDiscountSet.shopMoney.amount > 0) {
            addons.push(line);
          } else {
            promo.push(line);
          }
        }
      }

      for (const [lineIndex, line] of mainItems.entries()) {
        let programStartDate, programEndDate, programLength;
        const lineIsProgram = line?.node?.variant?.product?.tags?.includes("Programy");
        const lineSku = line?.node?.variant?.sku;
        const lineQuantity = nonProgramOrder ? 1 : line.node.quantity;
        let promoField, addonsField;
        const severeAllergicAttr =
          line?.node?.customAttributes?.find((attr: any) => attr.key.includes("severe allergy") || attr.key.includes("alergik"))?.value ||
          order.node?.customAttributes?.find((attr: any) => attr.key.includes(`Alergik_${lineSku}`))?.value;
        const severeAllergic = severeAllergicAttr == "Yes" || severeAllergicAttr == "Ano" ? true : false;

        if (lineIsProgram) {
          programLength = line.node?.variant?.sku?.split("D")[0];
          programLength = setProgramLengthWord(parseInt(programLength));
        }

        for (let i = 0; i < lineQuantity; i++) {
          if (lineIsProgram && order.node.customAttributes) {
            for (const attribute of order.node.customAttributes) {
              if (attribute.key === "Datum začátku Yes Krabiček") {
                programStartDate = attribute.value;
              }
              if (attribute.key === `Konec_${line.node?.variant?.id?.replace("gid://shopify/ProductVariant/", "")}`) {
                programEndDate = attribute.value;

                // change program end date of AKCE items to be after the main program
                continue;
                if (line.node.customAttributes.find((attr: any) => attr.key == "AKCE")) {
                  // add note about AKCE to the main program
                  if (!programLength.includes("AKCE zdarma")) {
                    programLength += `| AKCE zdarma, navazuje na hlavní program`;
                  }

                  console.log(order.node.id, line.node.title);

                  // find the main program
                  let mainProgram = order.node.lineItems.edges.find((mainLine: any) => {
                    return line.node.title === mainLine.node.title && !mainLine.node.customAttributes.find((attr: any) => attr.key == "AKCE");
                  });

                  let mainProgramEndDate = order.node.customAttributes.find((attr: any) => {
                    return attr.key === `Konec_${mainProgram?.node?.variant?.id?.replace("gid://shopify/ProductVariant/", "")}`;
                  });

                  programStartDate = getFutureBusinessDate(convertDateToISOString(mainProgramEndDate.value), 1);
                  programEndDate = convertDateToLocalString(getFutureBusinessDate(programStartDate, 4)).replace(/\./g, "-");
                  programStartDate = convertDateToLocalString(programStartDate).replace(/\./g, "-");
                }
              }
            }
          }
          const customAttributes = order.node?.customAttributes?.map((attr: any) => {
            return `${attr.key}: ${attr.value}`;
          });

          if (lineIndex == 0 && mixedOrder) {
            if (promo.length > 0)
              promoField = promo
                .map((item: any) => {
                  const variantTitle = item.node.variant.title == "Default Title" ? "" : ` (${item.node.variant.title})`;
                  return `${item.node.quantity} x ${item.node.title} ${variantTitle}`;
                })
                .join("\n");
            if (addons.length > 0)
              addonsField = addons
                .map((item: any) => {
                  const variantTitle = item.node.variant.title == "Default Title" ? "" : ` (${item.node.variant.title})`;
                  return `${item.node.quantity} x ${item.node.title} ${variantTitle}`;
                })
                .join("\n");
          }

          let shippingAddress;
          if (order.node?.shippingAddress?.address1 && !order.node?.shippingAddress?.address2) {
            shippingAddress = order.node?.shippingAddress?.address1;
          } else if (order.node?.shippingAddress?.address1 && order.node?.shippingAddress?.address2) {
            shippingAddress = `${order.node?.shippingAddress?.address1} ${order.node?.shippingAddress?.address2}`;
          }

          const fullAddressArray = [];
          if (order.node?.shippingAddress?.address1) {
            fullAddressArray.push(order.node?.shippingAddress?.address1);
          }
          if (order.node?.shippingAddress?.address2) {
            fullAddressArray.push(order.node?.shippingAddress?.address2);
          }
          if (order.node?.shippingAddress?.city) {
            fullAddressArray.push(order.node?.shippingAddress?.city);
          }
          if (order.node?.shippingAddress?.zip) {
            fullAddressArray.push(order.node?.shippingAddress?.zip?.replace(/\s/g, ""));
          }

          const location = await client.request(locationQueryByName, {
            query: `name:${order.node?.shippingLine?.title}`,
          });

          const pickupLocationAddress = location?.locations?.edges[0]?.node?.address
            ? `Pickup ${order.node?.shippingLine?.title}, ${location?.locations?.edges[0]?.node?.address?.address1}, ${location?.locations?.edges[0]?.node?.address?.city}, ${location?.locations?.edges[0]?.node?.address?.zip}`
            : "";

          let fullAddress = fullAddressArray.join(", ");
          if (!shippingAddress) {
            fullAddress = pickupLocationAddress;
          }

          const shippingInstructions = getShippingInstructions(order);
          const variantTitle = line.node.variant.title == "Default Title" ? "" : ` (${line.node.variant.title})`;
          const lineItemName = lineIsProgram ? line.node.title : line.node.quantity + " x " + line.node.title + variantTitle;

          // check if line has associated single portions
          const lineProgramId = lineIsProgram ? line.node.customAttributes.find((attr: any) => attr.key == "_program_id")?.value : null;
          const programSinglePortions = singlePortions.filter(
            (item: any) => item.node.customAttributes.find((attr: any) => attr.key == "_program_id")?.value == lineProgramId
          );

          const singlePortionsCol =
            programSinglePortions.length > 0
              ? programSinglePortions
                  .map((item: any) => {
                    const variantTitle = item.node.variant.title == "Default Title" ? "" : ` (${item.node.variant.title})`;
                    return `${item.node.quantity} x ${item.node.title} ${variantTitle}`;
                  })
                  .join("\n")
              : "";

          const row = [
            order.node?.name,
            order.node?.displayFinancialStatus,
            order.node?.billingAddress?.name,
            order.node?.shippingAddress?.name || "",
            order.node?.shippingAddress?.company || "",
            order.node?.shippingAddress?.phone || order.node?.billingAddress?.phone || "",
            shippingAddress || `${order.node?.shippingLine?.title ? `Pickup ${order.node?.shippingLine?.title}` : ""}` || "",
            order.node?.shippingAddress?.city || "",
            order.node?.shippingAddress?.zip?.replace(/\s/g, "") || "",
            fullAddress,
            shippingInstructions,
            order.node?.note,
            customAttributes?.join("\n"),
            i == 0 ? (addonsField ? addonsField : "") : "", // if line has qty > 1, add addons to the first item
            promoField ? promoField : "",
            programStartDate,
            programEndDate,
            lineItemName,
            singlePortionsCol,
            programLength ? programLength : "",
            lineIsProgram ? line.node?.title?.split(" | ")[1]?.replace(" kcal", "") : "",
            severeAllergic ? "Ano" : "",
          ];
          if (lineIsProgram) {
            let allergens = line.node?.customAttributes?.find(
              (attr: any) => (attr.key == "Vyřazeno" || attr.key == "Excluded" || attr.key == "Alergeny") && attr.value != ""
            );

            if (order.node.customAttributes && order.node.sourceName == "shopify_draft_order") {
              for (const attribute of order.node.customAttributes) {
                if (attribute.key.includes("Vyřazeno") || attribute.key.includes("Excluded") || attribute.key.includes("Alergeny")) {
                  const sku = line.node.variant.sku;
                  if (attribute.key.includes(sku)) {
                    allergens = attribute;
                  }
                }
              }
            }

            if (allergens) {
              allergens = allergens.value.split(",").map((allergen: string) => allergen.trim());

              const firstRow = worksheet.getRow(1);

              firstRow.eachCell((cell, colNumber) => {
                if (colNumber > 21) {
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

    const attachment = {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      name: `orders-${yesterday}.xlsx`,
      content: base64Content,
    };

    const shouldSendEmail = req.query.sendEmail !== "false";
    const isRevisedDoc = req.query.revised === "true";
    if (shouldSendEmail) {
      const sendEmail = await sendNotification(
        `Objednávky ${yesterday} ${isRevisedDoc ? "(opravný export)" : ""}`,
        recipientEmails,
        `Objednávky ze dne ${yesterday} jsou připraveny k exportu`,
        null,
        MANDRILL_MESSAGE_BCC_ADDRESS_DEV as string,
        attachment,
        true
      );
    }
    return res.status(200).json(attachment);
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
