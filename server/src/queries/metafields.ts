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

export const metaobjectsQuery = gql`
  query ($query: String!, $type: String!) {
    metaobjects(query: $query, type: $type, first: 1) {
      edges {
        node {
          id
          fields {
            key
            value
          }
        }
      }
    }
  }
`;

export const metaobjectUpdateMutation = gql`
  mutation UpdateMetaobject($id: ID!, $metaobject: MetaobjectUpdateInput!) {
    metaobjectUpdate(id: $id, metaobject: $metaobject) {
      metaobject {
        handle
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;
