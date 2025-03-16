"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.products_export = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const graphql_request_1 = require("graphql-request");
const exceljs_1 = __importDefault(require("exceljs"));
const products_1 = require("../queries/products");
dotenv_1.default.config();
const { ACCESS_TOKEN, STORE, API_VERSION, ORDER_EXPORT_RECIPIENTS, MANDRILL_MESSAGE_BCC_ADDRESS_DEV } = process.env;
/*-------------------------------------MAIN FUNCTION------------------------------------------------*/
const products_export = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const vat = req.query.vat;
        const query = vat == "standard" ? "tag_not:'DPH 12%'" : "tag:'DPH 12%'";
        const vatTotal = vat == "standard" ? 121 : 112;
        const client = new graphql_request_1.GraphQLClient(`https://${STORE}/admin/api/${API_VERSION}/graphql.json`, {
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
        const allProducts = yield (0, products_1.allProductsQuery)(query);
        // return res.status(200).json(allProducts);
        const workbook = new exceljs_1.default.Workbook();
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
                if (variantPrice <= 1)
                    continue;
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
                yield new Promise(resolve => setTimeout(resolve, 250));
            }
        }
        yield workbook.xlsx.writeFile(`products-${vat}.xlsx`);
        return res.status(200).json("OK");
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal server error" });
    }
});
exports.products_export = products_export;
const getYesterday = () => {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    return date.toISOString().split("T")[0];
};
