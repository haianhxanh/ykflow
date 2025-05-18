"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.locationQueryByName = exports.locationsQuery = void 0;
const graphql_request_1 = require("graphql-request");
exports.locationsQuery = (0, graphql_request_1.gql) `
  query {
    locations(first: 250) {
      edges {
        node {
          id
          name
          metafield(key: "daily_orders_capacity", namespace: "ykflow") {
            value
          }
        }
      }
    }
  }
`;
exports.locationQueryByName = (0, graphql_request_1.gql) `
  query ($query: String!) {
    locations(first: 1, query: $query) {
      edges {
        node {
          id
          name
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
`;
