import { gql } from "graphql-request";

export const createDiscountCodeMutation = gql`
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

export const discountQuery = gql`
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
                    }
                  }
                }
                productVariants(first: 250) {
                  edges {
                    node {
                      id
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
