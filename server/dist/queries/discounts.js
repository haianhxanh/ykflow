"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.discountQuery = exports.createDiscountCodeMutation = void 0;
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
exports.discountQuery = (0, graphql_request_1.gql) `
  query Discount($discountGid: ID!) {
    discountNode(id: $discountGid) {
      discount {
        ... on DiscountAutomaticBasic {
          title
          startsAt
          endsAt
          status
          customerGets {
            items {
              ... on DiscountCollections {
                collections(first: 100) {
                  edges {
                    node {
                      id
                    }
                  }
                }
              }
              ... on DiscountProducts {
                products(first: 250) {
                  edges {
                    node {
                      id
                      variants(first: 250) {
                        edges {
                          node {
                            id
                            sku
                          }
                        }
                      }
                    }
                  }
                }
                productVariants(first: 250) {
                  edges {
                    node {
                      id
                      sku
                    }
                  }
                }
              }
            }
            value {
              ... on DiscountAmount {
                amount {
                  amount
                }
              }
              ... on DiscountPercentage {
                percentage
              }
            }
          }
        }
      }
    }
  }
`;
