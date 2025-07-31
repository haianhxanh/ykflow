import { gql } from "graphql-request";
import axios from "axios";
import dotenv from "dotenv";
import { promisify } from "util";
dotenv.config();
const { ACCESS_TOKEN, STORE, API_VERSION } = process.env;
const sleep = promisify(setTimeout);

export const productsQuery = gql`
  query ($query: String) {
    products(first: 250, query: $query) {
      edges {
        node {
          id
        }
      }
    }
  }
`;

export async function allProductsQuery(query: string) {
  let cursor = "";
  let hasNextPage = true;
  let products: any[] = [];
  while (hasNextPage) {
    const response = await axios.post(
      `https://${STORE}/admin/api/${API_VERSION}/graphql.json`,
      {
        query: `query{
          products(query: "${query}", first: 250${cursor ? `, after: "${cursor}"` : ""}) {
            pageInfo {
              hasNextPage
              endCursor
            }
            edges {
              node {
                id
                title
                variants(first: 250) {
                  edges {
                    node {
                      title
                      price
                      sku
                      inventoryItem {
                        id
                        tracked
                        inventoryLevels(first: 1) {
                          edges {
                            node {
                              quantities(names: ["available"]) {
                                name
                                quantity
                              }
                            }
                          }
                        }
                      }
                    }
                  }
                }           
              }
            }
          }
        }`,
      },
      {
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": ACCESS_TOKEN,
        },
      }
    );

    const data = response.data.data.products;
    hasNextPage = data.pageInfo.hasNextPage;
    cursor = data.pageInfo.endCursor;
    products = products.concat(data.edges);
    await sleep(250);
  }

  return products;
}

export const allProgramsQuery = gql`
  query {
    programs(first: 250) {
      edges {
        node {
          id
        }
      }
    }
  }
`;

export const productsQueryWithVariants = gql`
  query {
    products(first: 250) {
      edges {
        node {
          id
          variants(first: 250) {
            edges {
              node {
                id
                sku
                metafields(first: 10, namespace: "campaign") {
                  edges {
                    node {
                      id
                      namespace
                      key
                      value
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;
