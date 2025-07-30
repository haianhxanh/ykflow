import { gql } from "graphql-request";

export const collectionQuery = gql`
  query Collection($collectionGid: ID!) {
    collection(id: $collectionGid) {
      id
      products(first: 250) {
        edges {
          node {
            id
            tags
            variants(first: 250) {
              edges {
                node {
                  id
                  sku
                  metafields(first: 10, namespace: "campaign") {
                    edges {
                      node {
                        id
                        key
                        value
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;
