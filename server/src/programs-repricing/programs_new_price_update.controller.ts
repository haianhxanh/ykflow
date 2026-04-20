import { Request, Response } from "express";
import dotenv from "dotenv";
import { GraphQLClient } from "graphql-request";
import ExcelJS from "exceljs";
import { metafieldsSetMutation } from "../queries/metafields";
import { productVariantsBulkUpdate, variantBySkuQuery } from "../queries/variants";

dotenv.config();
const { ACCESS_TOKEN, STORE, API_VERSION } = process.env;

/*-------------------------------------MAIN FUNCTION------------------------------------------------*/

export const programs_new_price_update = async (req: Request, res: Response) => {
  try {
    const excelFilePath = req.query.excelFilePath as string;
    if (!excelFilePath) {
      return res.status(400).json({ error: "excelFilePath query parameter is required" });
    }

    const client = new GraphQLClient(`https://${STORE}/admin/api/${API_VERSION}/graphql.json`, {
      headers: {
        "X-Shopify-Access-Token": ACCESS_TOKEN as string,
      },
    });

    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(excelFilePath);
    const worksheet = workbook.getWorksheet(1);
    if (!worksheet) {
      return res.status(400).json({ error: "Worksheet not found in Excel file" });
    }

    const results: { sku: string; status: string; errors?: any }[] = [];
    const rows = worksheet.getRows(1, worksheet.rowCount) || [];

    for (const row of rows) {
      const sku = row.getCell(1).value?.toString().trim();
      const price = row.getCell(2).value?.toString().trim();
      const progressivePrice = row.getCell(3).value?.toString().trim();

      if (!sku || !price) {
        console.log(`Skipping row ${row.number}: missing SKU or price`);
        continue;
      }

      const variantData: any = await client.request(variantBySkuQuery, { query: `sku:${sku}` });
      const variant = variantData?.productVariants?.edges?.[0]?.node;

      if (!variant) {
        console.log(`Variant not found for SKU: ${sku}`);
        results.push({ sku, status: "not_found" });
        continue;
      }

      // Update price
      const priceUpdate: any = await client.request(productVariantsBulkUpdate, {
        productId: variant.product.id,
        variants: [{ id: variant.id, price }],
      });

      const priceErrors = priceUpdate?.productVariantsBulkUpdate?.userErrors;
      if (priceErrors?.length > 0) {
        console.log(`Error updating price for SKU ${sku}:`, priceErrors);
        results.push({ sku, status: "price_update_error", errors: priceErrors });
        continue;
      }

      // Update custom.progressive_price metafield
      if (progressivePrice) {
        const metafieldUpdate: any = await client.request(metafieldsSetMutation, {
          metafields: [
            {
              ownerId: variant.id,
              namespace: "custom",
              key: "progressive_price",
              value: progressivePrice,
              type: "number_decimal",
            },
          ],
        });

        const metafieldErrors = metafieldUpdate?.metafieldsSet?.userErrors;
        if (metafieldErrors?.length > 0) {
          console.log(`Error updating metafield for SKU ${sku}:`, metafieldErrors);
          results.push({ sku, status: "metafield_update_error", errors: metafieldErrors });
          continue;
        }
      }

      console.log(`Updated SKU ${sku}: price=${price}, progressive_price=${progressivePrice}`);
      results.push({ sku, status: "updated" });

      await new Promise((resolve) => setTimeout(resolve, 300));
    }

    return res.status(200).json({ results });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error", errorDetails: error });
  }
};
