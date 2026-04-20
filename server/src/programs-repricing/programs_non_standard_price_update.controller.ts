import { Request, Response } from "express";
import dotenv from "dotenv";
import { GraphQLClient } from "graphql-request";
import { productVariantsBulkUpdate, variantBySkuQuery } from "../queries/variants";

dotenv.config();
const { ACCESS_TOKEN, STORE, API_VERSION } = process.env;

const STANDARD_DAYS = [5, 10, 15, 20, 40, 60];
const CALORIE_TYPES = [1500, 1750, 2000, 2250, 2500, 3000];
const NON_STANDARD_DAYS = Array.from({ length: 60 }, (_, i) => i + 1).filter((d) => !STANDARD_DAYS.includes(d));

const getBaseDays = (day: number): number => {
  if (day < 10) return 5;
  if (day < 15) return 10;
  if (day < 20) return 15;
  if (day < 40) return 20;
  return 40;
};

/*-------------------------------------MAIN FUNCTION------------------------------------------------*/

export const programs_non_standard_price_update = async (req: Request, res: Response) => {
  try {
    const client = new GraphQLClient(`https://${STORE}/admin/api/${API_VERSION}/graphql.json`, {
      headers: {
        "X-Shopify-Access-Token": ACCESS_TOKEN as string,
      },
    });

    const skipped: string[] = [];
    const results: { sku: string; price: string; status: string; errors?: any }[] = [];

    for (const calories of CALORIE_TYPES) {
      console.log(`\n--- ${calories} kcal ---`);

      // Fetch standard base prices for this calorie type
      const basePrices: Record<number, number> = {};
      for (const standardDay of STANDARD_DAYS) {
        const sku = `${standardDay}D${calories}`;
        const data: any = await client.request(variantBySkuQuery, { query: `sku:${sku}` });
        const variant = data?.productVariants?.edges?.[0]?.node;
        if (variant) {
          basePrices[standardDay] = parseFloat(variant.price);
          console.log(`  Base ${sku}: ${variant.price}`);
        }
      }

      // Loop through non-standard days, calculate and update each
      for (const day of NON_STANDARD_DAYS) {
        const sku = `${day}D${calories}`;
        const baseDays = getBaseDays(day);
        const basePrice = basePrices[baseDays];

        if (basePrice === undefined) {
          console.log(`  ${sku}: no base price for ${baseDays}D — skipping`);
          skipped.push(sku);
          continue;
        }

        const data: any = await client.request(variantBySkuQuery, { query: `sku:${sku}` });
        const variant = data?.productVariants?.edges?.[0]?.node;
        if (!variant) continue; // SKU doesn't exist in the store

        const calculatedPrice = Math.round((basePrice / baseDays) * day).toFixed(2);
        console.log(`  ${sku}: ${baseDays}D base @ ${basePrice} → ${calculatedPrice}`);

        // const update: any = await client.request(productVariantsBulkUpdate, {
        //   productId: variant.product.id,
        //   variants: [{ id: variant.id, price: calculatedPrice }],
        // });

        // const errors = update?.productVariantsBulkUpdate?.userErrors || [];
        // if (errors.length > 0) {
        //   console.log(`  Error updating ${sku}:`, errors);
        //   results.push({ sku, price: calculatedPrice, status: "error", errors });
        // } else {
        //   results.push({ sku, price: calculatedPrice, status: "updated" });
        // }

        // await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }

    return res.status(200).json({ skipped, results });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error", errorDetails: error });
  }
};
