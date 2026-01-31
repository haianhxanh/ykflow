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

export const upsell_performance = async (req: Request, res: Response) => {
  try {
    const client = new GraphQLClient(`https://${STORE}/admin/api/${API_VERSION}/graphql.json`, {
      // @ts-ignore
      headers: {
        "X-Shopify-Access-Token": ACCESS_TOKEN,
      },
    });

    const workbook = new exceljs.Workbook();
    const sheet = workbook.addWorksheet("Sheet1");
    const orders = await allOrdersQuery("created_at:>=2025-12-01 AND created_at:<=2025-12-31");
    const upgradedOrders = orders.filter((order: any) => {
      return order?.node?.lineItems?.edges?.some((line: any) => {
        return line?.node?.customAttributes?.some((attr: any) => attr.key == "_upgraded_program");
      });
    })

    console.log(upgradedOrders.length);

    for (const upgradedOrder of upgradedOrders) {
      const giftLineItems = upgradedOrder?.node?.lineItems?.edges?.filter((line: any) => {
        return line?.node?.customAttributes?.some((attr: any) => attr.key == "_upgraded_program_gift");
      });
      console.log("Order: ", upgradedOrder?.node?.name);

      for (const giftLineItem of giftLineItems) {
        // get upgraded program
        const giftProgramId = giftLineItem?.node?.customAttributes?.find((attr: any) => attr.key == "_program_id")?.value;
        // get upgraded program
        const upgradedProgram = upgradedOrder?.node?.lineItems?.edges?.find((line: any) => {
          return line?.node?.customAttributes?.find((attr: any) => attr.key == "_program_id")?.value == giftProgramId && line?.node?.customAttributes?.find((attr: any) => attr.key == "_upgraded_program")
        });
        const upgradedProgramPrice = parseFloat(upgradedProgram?.node?.discountedUnitPriceSet?.shopMoney?.amount) || 0;

        const giftVariant = await client.request(variantByIdQuery, { variantGid: giftLineItem?.node?.variant?.id });
        const upgradedLength = upgradedProgram?.node?.variant?.sku?.split("D")[0] + "D";
        const programCalories =  upgradedProgram?.node?.variant?.sku?.split("D")[1];

        const upsell = upsellDetails.find((detail: any) => {
          return detail.to == upgradedLength && giftLineItem.node.variant.id == detail.gift_variant_id;
        });
        
        const originalProgramSku = upsell?.from ? upsell?.from + programCalories : null;
        const originalProgram = originalProgramSku ? await client.request(variantsByQuery, { query: `sku:${originalProgramSku} AND status:ACTIVE AND tags:Programy`, first: 1 }) : null;
        const priceDifference = upgradedProgramPrice - originalProgram?.productVariants?.edges[0]?.node?.metafield?.value;

        const row = [
          upgradedOrder?.node?.createdAt.split("T")[0],
          upgradedOrder?.node?.name,
          upsell?.from ? upsell?.from + programCalories : "",
          upsell?.to ? upsell?.to + programCalories : "",
          priceDifference || "",
          giftVariant?.productVariant?.product?.title + " - " + giftVariant?.productVariant?.title || "",
          upsell?.gift_variant_price || "",
        ];
        sheet.addRow(row);
        // save workbook
        await workbook.xlsx.writeFile("upsell_performance_2025-12.xlsx");
      }
    }
    

    return res.status(200).json("OK");

  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal server error" });
  }
};