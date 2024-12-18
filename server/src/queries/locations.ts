import { gql } from "graphql-request";

export const locationsQuery = gql`
  query {
    locations(first: 250) {
      edges {
        node {
          id
          name
          metafield(key: "daily_orders_capacity", namespace: "ykflow") {
            value
          }
        }
      }
    }
  }
`;
