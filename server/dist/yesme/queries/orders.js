"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.yesmeOrdersExportQuery = void 0;
const graphql_request_1 = require("graphql-request");
exports.yesmeOrdersExportQuery = (0, graphql_request_1.gql) `
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
          displayFinancialStatus
          deliveryDate: metafield(namespace: "delivery", key: "date") {
            jsonValue
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
