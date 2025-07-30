"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.variantByIdQuery = void 0;
const graphql_request_1 = require("graphql-request");
exports.variantByIdQuery = (0, graphql_request_1.gql) `
  query productVariant($variantGid: ID!) {
    productVariant(id: $variantGid) {
      id
      metafields(first: 10, namespace: "campaign") {
        edges {
          node {
            id
            key
            value
          }
        }
      }
      sku
      product {
        tags
      }
    }
  }
`;
