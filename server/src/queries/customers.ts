import { gql } from "graphql-request";

export const customerQuery = gql`
  query getCustomer($id: ID!) {
    customer(id: $id) {
      id
      email
      firstName
      lastName
      phone
    }
  }
`;
