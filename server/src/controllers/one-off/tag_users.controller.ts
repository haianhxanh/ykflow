// tag users based on orders from Excel file
import { GraphQLClient } from "graphql-request";
import ExcelJS from "exceljs";
import { ordersQuery } from "../../queries/orders";
import { addTagsMutation } from "../../queries/commonObjects";

const { ACCESS_TOKEN, STORE, API_VERSION } = process.env;

export const tag_users = async (req: any, res: any) => {
  try {
    const excelFilePath = req.query.excelFilePath as string;
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.readFile(excelFilePath);
    const worksheet = workbook.getWorksheet(1);
    const rows = worksheet?.getRows(1, worksheet?.rowCount);
    const orders = rows?.map((row: any) => row.getCell(1).value);

    // filter out first item and ANY items with VIP as value
    const filteredOrders = orders?.filter((order: any) => order !== orders?.[0] && !order?.includes("VIP"));

    console.log(filteredOrders?.length);

    const client = new GraphQLClient(`https://${STORE}/admin/api/${API_VERSION}/graphql.json`, {
      // @ts-ignore
      headers: {
        "X-Shopify-Access-Token": ACCESS_TOKEN,
      },
    });

    for (const [index, orderName] of filteredOrders?.entries() || []) {
      const order = await client.request(ordersQuery, { query: `name:${orderName}` });
      const customerId = order.orders.edges[0].node.customer.id;
      const tagsAdded = await client.request(addTagsMutation, { id: customerId, tags: ["MISSING_RATING_WEEK_09_2026"] });
      console.log(
        `${index + 1} of ${filteredOrders?.length} - ${orderName} - ${customerId} - ${tagsAdded.tagsAdd.userErrors?.length > 0 ? tagsAdded.tagsAdd.userErrors[0].message : "OK"}`,
      );
    }

    const columns = [{ header: "Email", key: "email", width: 20 }];
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Internal server error" });
  }
};
