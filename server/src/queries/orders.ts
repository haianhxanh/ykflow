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
          note
          displayFinancialStatus
          paymentGatewayNames
          tags
          billingAddress {
            name
            company
            phone
            address1
            city
            zip
          }
          shippingAddress {
            name
            company
            phone
            address1
            city
            zip
          }
          shippingLine {
            title
          }
          lineItems(first: 250) {
            edges {
              node {
                id
                title
                quantity
                totalDiscountSet {
                  shopMoney {
                    amount
                  }
                }
                originalTotalSet {
                  shopMoney {
                    amount
                  }
                }
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

export const orderQuery = gql`
  query ($id: ID!) {
    order(id: $id) {
      customAttributes {
        key
        value
      }
    }
  }
`;

export const orderUpdateMutation = gql`
  mutation updateOrderAttributes($input: OrderInput!) {
    orderUpdate(input: $input) {
      order {
        id
        customAttributes {
          key
          value
        }
      }
      userErrors {
        message
        field
      }
    }
  }
`;
