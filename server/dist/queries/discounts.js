"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createDiscountCodeMutation = void 0;
const graphql_request_1 = require("graphql-request");
exports.createDiscountCodeMutation = (0, graphql_request_1.gql) `
  mutation CreateDiscountCode($basicCodeDiscount: DiscountCodeBasicInput!) {
    discountCodeBasicCreate(basicCodeDiscount: $basicCodeDiscount) {
      codeDiscountNode {
        id
        codeDiscount {
          ... on DiscountCodeBasic {
            codes(first: 100) {
              edges {
                node {
                  code
                }
              }
            }
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;
