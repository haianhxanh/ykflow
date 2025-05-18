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

export const locationQueryByName = gql`
  query ($query: String!) {
    locations(first: 1, query: $query) {
      edges {
        node {
          id
          name
          address {
            address1
            address2
            city
            zip
            country
          }
        }
      }
    }
  }
`;
