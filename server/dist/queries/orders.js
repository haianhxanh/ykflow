"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ordersQuery = void 0;
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
          billingAddress {
            name
          }
          shippingAddress {
            name
            company
            phone
            address1
            city
            zip
          }
          lineItems(first: 1) {
            edges {
              node {
                title
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
