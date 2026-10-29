import { gql } from "graphql-request";

export const yesmeOrdersExportQuery = gql`
  query YesmeOrdersExport($query: String, $cursor: String) {
    orders(first: 100, query: $query, after: $cursor) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id
          name
          createdAt
          cancelledAt
          closed
          displayFinancialStatus
          deliveryDate: metafield(namespace: "delivery", key: "date") {
            jsonValue
          }
          packingListHash: metafield(namespace: "yesme", key: "packing_list_hash") {
            value
          }
          billingAddress {
            firstName
            lastName
            name
            company
            phone
            address1
            address2
            city
            zip
            country
            countryCodeV2
          }
          shippingAddress {
            firstName
            lastName
            name
            company
            phone
            address1
            address2
            city
            zip
            country
            countryCodeV2
          }
          customer {
            firstName
            lastName
            defaultPhoneNumber {
              phoneNumber
            }
          }
          purchasingEntity {
            ... on PurchasingCompany {
              company {
                id
                name
                ico: metafield(namespace: "custom", key: "ico") {
                  jsonValue
                }
                dic: metafield(namespace: "custom", key: "dic") {
                  jsonValue
                }
              }
              location {
                id
                name
                carrierNote: metafield(namespace: "delivery", key: "carrier_note") {
                  jsonValue
                }
                priceList: metafield(namespace: "b2b", key: "price_list") {
                  jsonValue
                  reference {
                    ... on Metaobject {
                      displayName
                      handle
                      name: field(key: "name") {
                        jsonValue
                      }
                      sleeveType: field(key: "sleeve_type") {
                        jsonValue
                      }
                    }
                  }
                }
              }
            }
          }
          lineItems(first: 250) {
            edges {
              node {
                title
                sku
                quantity
                currentQuantity
                customAttributes {
                  key
                  value
                }
                discountedUnitPriceSet {
                  shopMoney {
                    amount
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

export const yesmeMetafieldsSet = gql`
  mutation YesmeMetafieldsSet($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      userErrors {
        field
        message
      }
    }
  }
`;
