import { gql } from "graphql-request";

export const metafieldsSetMutation = gql`
  mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields {
        key
        namespace
        value
        createdAt
        updatedAt
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;

export const shopMetafieldQuery = gql`
  query ($namespace: String!, $key: String!) {
    shop {
      id
      metafield(namespace: $namespace, key: $key) {
        id
        value
      }
    }
  }
`;
