"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.yesmeCustomerQuery = exports.yesmeDraftOrderCreateMutation = void 0;
const graphql_request_1 = require("graphql-request");
exports.yesmeDraftOrderCreateMutation = (0, graphql_request_1.gql) `
  mutation yesmeDraftOrderCreate($input: DraftOrderInput!) {
    draftOrderCreate(input: $input) {
      draftOrder {
        id
        name
        invoiceUrl
        presentmentCurrencyCode
      }
      userErrors {
        field
        message
      }
    }
  }
`;
exports.yesmeCustomerQuery = (0, graphql_request_1.gql) `
  query yesmeCustomer($id: ID!) {
    customer(id: $id) {
      id
      taxExempt
      companyContactProfiles {
        id
        company {
          id
        }
      }
    }
  }
`;
