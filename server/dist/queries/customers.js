"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.customerQuery = void 0;
const graphql_request_1 = require("graphql-request");
exports.customerQuery = (0, graphql_request_1.gql) `
  query getCustomer($id: ID!) {
    customer(id: $id) {
      id
      email
      firstName
      lastName
      phone
    }
  }
`;
