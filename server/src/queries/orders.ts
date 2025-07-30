import { gql } from "graphql-request";
import axios from "axios";
import dotenv from "dotenv";
import { promisify } from "util";
dotenv.config();
const { ACCESS_TOKEN, STORE, API_VERSION } = process.env;
const sleep = promisify(setTimeout);

export const ordersQuery = gql`
  query ($query: String) {
    orders(first: 250, query: $query, reverse: true) {
      edges {
        node {
          customAttributes {
            key
            value
          }
          id
          name
          note
          displayFinancialStatus
          paymentGatewayNames
          tags
          billingAddress {
            name
            company
            phone
            address1
            address2
            city
            zip
          }
          shippingAddress {
            name
            company
            phone
            address1
            address2
            city
            zip
          }
          shippingLine {
            title
          }
          sourceName
          lineItems(first: 250) {
            edges {
              node {
                id
                title
                quantity
                totalDiscountSet {
                  shopMoney {
                    amount
                  }
                }
                originalTotalSet {
                  shopMoney {
                    amount
                  }
                }
                customAttributes {
                  key
                  value
                }
                variant {
                  id
                  title
                  product {
                    title
                    tags
                  }
                  sku
                }
              }
            }
          }
        }
      }
    }
  }
`;

export const orderQuery = gql`
  query ($id: ID!) {
    order(id: $id) {
      createdAt
      customAttributes {
        key
        value
      }
      id
      name
      email
      customer {
        id
        email
        phone
        firstName
        lastName
        createdAt
        updatedAt
      }
      shippingAddress {
        id
        address1
        address2
        city
        company
        country
        firstName
        lastName
        phone
        province
        zip
      }
      billingAddress {
        phone
      }
      lineItems(first: 250) {
        edges {
          node {
            sku
            variant {
              id
              sku
            }
          }
        }
      }
    }
  }
`;

export const orderUpdateMutation = gql`
  mutation updateOrderAttributes($input: OrderInput!) {
    orderUpdate(input: $input) {
      order {
        id
        customAttributes {
          key
          value
        }
      }
      userErrors {
        message
        field
      }
    }
  }
`;

export async function allOrdersQuery(query: string) {
  let cursor = "";
  let hasNextPage = true;
  let orders: any[] = [];
  while (hasNextPage) {
    const response = await axios.post(
      `https://${STORE}/admin/api/${API_VERSION}/graphql.json`,
      {
        query: `query{
          orders(query: "${query}", first: 250${cursor ? `, after: "${cursor}"` : ""}) {
            pageInfo {
              hasNextPage
              endCursor
            }
            edges {
              node {
                id
                name
                customAttributes {
                  key
                  value
                }
                shippingLine {
                  title
                }
                lineItems(first: 250) {
                  edges {
                    node {
                      id 
                      title
                      quantity
                      variant {
                        id
                        title
                        product {
                          title
                          tags
                        }
                      }
                    }
                  }
                }
                transactions(first: 250) {
                  id
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

    const data = response.data.data.orders;
    hasNextPage = data.pageInfo.hasNextPage;
    cursor = data.pageInfo.endCursor;
    orders = orders.concat(data.edges);
    await sleep(750);
  }

  return orders;
}

export async function allGiftCardsQuery(query: string) {
  let cursor = "";
  let hasNextPage = true;
  let giftCards: any[] = [];
  while (hasNextPage) {
    const response = await axios.post(
      `https://${STORE}/admin/api/${API_VERSION}/graphql.json`,
      {
        query: `query{
          giftCards(first: 250${cursor ? `, after: "${cursor}"` : ""}, query: "${query}") {
            pageInfo {
              hasNextPage
              endCursor
            }
            edges {
              node {
                id
                createdAt
                order {
                  name
                }
                initialValue {
                  amount
                }
                transactions(first: 250) {
                  edges {
                    node {
                      id
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

    const data = response.data.data.giftCards;
    hasNextPage = data.pageInfo.hasNextPage;
    cursor = data.pageInfo.endCursor;
    giftCards = giftCards.concat(data.edges);
    await sleep(750);
  }

  return giftCards;
}
