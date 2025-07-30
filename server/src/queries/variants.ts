import { gql } from "graphql-request";

export const variantByIdQuery = gql`
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
