import { GraphQLClient } from "graphql-request";
import dotenv from "dotenv";
dotenv.config();

const { ACCESS_TOKEN, STORE, API_VERSION } = process.env;

export const shopifyClient = new GraphQLClient(`https://${STORE}/admin/api/${API_VERSION}/graphql.json`, {
  // @ts-ignore
  headers: {
    "X-Shopify-Access-Token": ACCESS_TOKEN,
  },
});
