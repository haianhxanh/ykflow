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
exports.allGiftCardsQuery = exports.allOrdersQuery = exports.orderUpdateMutation = exports.orderQuery = exports.ordersQuery = void 0;
const graphql_request_1 = require("graphql-request");
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = __importDefault(require("dotenv"));
const util_1 = require("util");
dotenv_1.default.config();
const { ACCESS_TOKEN, STORE, API_VERSION } = process.env;
const sleep = (0, util_1.promisify)(setTimeout);
exports.ordersQuery = (0, graphql_request_1.gql) `
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
          fulfillmentOrders(first: 10) {
            edges {
              node {
                id
                deliveryMethod {
                  methodType
                }
                assignedLocation {
                  location {
                    address {
                      address1
                      address2
                      city
                      zip
                      country
                    }
                  }
                }
              }
            }
          }
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
            country
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
exports.orderQuery = (0, graphql_request_1.gql) `
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
            product {
              tags
            }
          }
        }
      }
    }
  }
`;
exports.orderUpdateMutation = (0, graphql_request_1.gql) `
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
function allOrdersQuery(query) {
    return __awaiter(this, void 0, void 0, function* () {
        let cursor = "";
        let hasNextPage = true;
        let orders = [];
        while (hasNextPage) {
            const response = yield axios_1.default.post(`https://${STORE}/admin/api/${API_VERSION}/graphql.json`, {
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
                createdAt
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
                      discountedUnitPriceSet {
                        shopMoney {
                          amount
                        }
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
                      customAttributes {
                        key
                        value
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
            }, {
                headers: {
                    "Content-Type": "application/json",
                    "X-Shopify-Access-Token": ACCESS_TOKEN,
                },
            });
            const data = response.data.data.orders;
            hasNextPage = data.pageInfo.hasNextPage;
            cursor = data.pageInfo.endCursor;
            orders = orders.concat(data.edges);
            yield sleep(750);
        }
        return orders;
    });
}
exports.allOrdersQuery = allOrdersQuery;
function allGiftCardsQuery(query) {
    return __awaiter(this, void 0, void 0, function* () {
        let cursor = "";
        let hasNextPage = true;
        let giftCards = [];
        while (hasNextPage) {
            const response = yield axios_1.default.post(`https://${STORE}/admin/api/${API_VERSION}/graphql.json`, {
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
            }, {
                headers: {
                    "Content-Type": "application/json",
                    "X-Shopify-Access-Token": ACCESS_TOKEN,
                },
            });
            const data = response.data.data.giftCards;
            hasNextPage = data.pageInfo.hasNextPage;
            cursor = data.pageInfo.endCursor;
            giftCards = giftCards.concat(data.edges);
            yield sleep(750);
        }
        return giftCards;
    });
}
exports.allGiftCardsQuery = allGiftCardsQuery;
