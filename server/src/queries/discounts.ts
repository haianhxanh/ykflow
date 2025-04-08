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
