"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.collectionQuery = void 0;
const graphql_request_1 = require("graphql-request");
exports.collectionQuery = (0, graphql_request_1.gql) `
  query Collection($collectionGid: ID!) {
    collection(id: $collectionGid) {
      id
      products(first: 250) {
        edges {
          node {
            id
            tags
            variants(first: 250) {
              edges {
                node {
                  id
                  sku
                  metafields(first: 10, namespace: "campaign") {
                    edges {
                      node {
                        id
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
  }
`;
