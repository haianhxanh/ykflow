import { Request, Response } from "express";
import dotenv from "dotenv";
import { GraphQLClient } from "graphql-request";
import ExcelJS from "exceljs";
import { allProductsQuery } from "../queries/products";
import { addTagsMutation } from "../queries/commonObjects";

dotenv.config();
const { ACCESS_TOKEN, STORE, API_VERSION, ORDER_EXPORT_RECIPIENTS, MANDRILL_MESSAGE_BCC_ADDRESS_DEV } = process.env;

/*-------------------------------------MAIN FUNCTION------------------------------------------------*/

export const products_export = async (req: Request, res: Response) => {
  try {
    const vat = req.query.vat;
    const query = vat == "standard" ? "tag_not:'DPH 12%'" : "tag:'DPH 12%'";
    const vatTotal = vat == "standard" ? 121 : 112;
    const client = new GraphQLClient(`https://${STORE}/admin/api/${API_VERSION}/graphql.json`, {
      // @ts-ignore
      headers: {
        "X-Shopify-Access-Token": ACCESS_TOKEN,
      },
    });

    // tag with DPH 12%
    // const allProducts = await allProductsQuery("collection_id:390902710501");
    // for (const [index, product] of allProducts.entries()) {
    //   const tag = "DPH 12%";
    //   const tagAdded = await client.request(addTagsMutation, {
    //     id: product.node.id,
    //     tags: [tag],
    //   });
    //   if (tagAdded.tagsAdd.userErrors.length > 0) {
    //     console.error(`Error adding tag to product ${product.node.id}: ${tagAdded.tagsAdd.userErrors[0].message}`);
    //   } else {
    //     console.log(`Tag added to product ${product.node.id}`);
    //   }
    //   new Promise((resolve) => setTimeout(resolve, 200));
    // }

    const allProducts = await allProductsQuery(query);
    // return res.status(200).json(allProducts);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet(`Products`);

    for (const [index, product] of allProducts.entries()) {
      if (index === 0) {
        let header = [
          { header: "name", key: "name", width: 10 },
          { header: "native_retail_price", key: "priceExclVat", width: 10 },
          { header: "vat_rate", key: "vat", width: 10 },
          { header: "sku", key: "sku", width: 10 },
          { header: "suggest_for", key: "suggestFor", width: 10 },
          { header: "supply_type", key: "supplyType", width: 10 },
        ];
        worksheet.columns = header;
      }
      for (const variant of product.node.variants.edges) {
        const variantPrice = parseFloat(variant.node.price).toFixed(2);
        // @ts-ignore
        if (variantPrice <= 1) continue;
        const row = {
          name: `${product.node.title} - ${variant.node.title}`,
          // @ts-ignore
          priceExclVat: ((variantPrice / vatTotal) * 100).toFixed(2),
          vat: vat,
          sku: variant.node.sku,
          suggestFor: "both",
          supplyType: "goods",
        };
        console.log(`Processing ${index} - ${row.name}`);
        worksheet.addRow(row);
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
    }
    await workbook.xlsx.writeFile(`products-${vat}.xlsx`);
    return res.status(200).json("OK");
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
