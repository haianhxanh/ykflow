"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.orderUpdateMutation = exports.orderQuery = exports.ordersQuery = void 0;
const graphql_request_1 = require("graphql-request");
exports.ordersQuery = (0, graphql_request_1.gql) `
  query ($query: String) {
    orders(first: 250, query: $query) {
      edges {
        node {
          customAttributes {
            key
            value
          }
          id
          name
          displayFinancialStatus
          paymentGatewayNames
          tags
          billingAddress {
            name
            company
            phone
            address1
            city
            zip
          }
          shippingAddress {
            name
            company
            phone
            address1
            city
            zip
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
      customAttributes {
        key
        value
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
