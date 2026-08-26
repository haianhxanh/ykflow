import { gql } from "graphql-request";

export const yesmeDraftOrderCreateMutation = gql`
  mutation yesmeDraftOrderCreate($input: DraftOrderInput!) {
    draftOrderCreate(input: $input) {
      draftOrder {
        id
        name
        invoiceUrl
        presentmentCurrencyCode
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export const yesmeCustomerQuery = gql`
  query yesmeCustomer($id: ID!) {
    customer(id: $id) {
      id
      taxExempt
      companyContactProfiles {
        id
        company {
          id
        }
      }
    }
  }
`;
