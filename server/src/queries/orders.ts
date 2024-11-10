import { gql } from "graphql-request";

export const ordersQuery = gql`
  query ($query: String) {
    orders(first: 250, query: $query) {
      edges {
        node {
          customAttributes {
            key
            value
          }
          id
          name
          displayFinancialStatus
          billingAddress {
            name
          }
          shippingAddress {
            name
            company
            phone
            address1
            city
            zip
          }
          lineItems(first: 1) {
            edges {
              node {
                title
                customAttributes {
                  key
                  value
                }
                variant {
                  id
                  title
                  product {
                    title
                    tags
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
