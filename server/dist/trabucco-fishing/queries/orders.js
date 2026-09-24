"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.trabuccoDeliveryNoteOrderQuery = void 0;
const graphql_request_1 = require("graphql-request");
exports.trabuccoDeliveryNoteOrderQuery = (0, graphql_request_1.gql) `
  query TrabuccoDeliveryNoteOrder($id: ID!) {
    order(id: $id) {
      id
      name
      email
      phone
      createdAt
      processedAt
      taxesIncluded
      paymentGatewayNames
      customAttributes {
        key
        value
      }
      subtotalPriceSet {
        shopMoney {
          amount
        }
      }
      totalDiscountsSet {
        shopMoney {
          amount
        }
      }
      totalShippingPriceSet {
        shopMoney {
          amount
        }
      }
      totalTaxSet {
        shopMoney {
          amount
        }
      }
      totalPriceSet {
        shopMoney {
          amount
        }
      }
      customer {
        firstName
        lastName
      }
      shippingAddress {
        name
        company
        address1
        address2
        city
        zip
        country
        phone
      }
      billingAddress {
        name
        company
        address1
        address2
        city
        zip
        country
        phone
      }
      shippingLine {
        title
        originalPriceSet {
          shopMoney {
            amount
            currencyCode
          }
        }
        # NOT discountedPriceSet -- like lineItems, it doesn't reflect manual/percentage order
        # discounts (discountApplications), only some other discount types. Net is derived as
        # originalPriceSet minus the sum of discountAllocations instead (see delivery_note.ts).
        discountAllocations {
          allocatedAmountSet {
            shopMoney {
              amount
            }
          }
        }
        taxLines {
          rate
          ratePercentage
          priceSet {
            shopMoney {
              amount
            }
          }
        }
      }
      lineItems(first: 250) {
        edges {
          node {
            title
            name
            sku
            currentQuantity
            originalUnitPriceSet {
              shopMoney {
                amount
                currencyCode
              }
            }
            # Only used in basis=invoice mode, to replicate a historical Fakturoid invoice that
            # was built from this field (Shopify truncates -- not rounds -- the per-unit discount
            # here, so it doesn't match originalTotalSet - discountAllocations). See delivery_note.ts.
            discountedUnitPriceAfterAllDiscountsSet {
              shopMoney {
                amount
              }
            }
            # Line-level totals (already correctly rounded by Shopify) -- used instead of
            # multiplying a per-unit price out to the quantity, which amplifies rounding
            # error on high-quantity lines (see delivery_note.ts for why).
            originalTotalSet {
              shopMoney {
                amount
              }
            }
            # NOT discountedTotalSet -- it doesn't reflect manual/percentage order discounts
            # (discountApplications), only some other discount types; it silently equals
            # originalTotalSet for orders using a manual discount. Net is derived as
            # originalTotalSet minus the sum of discountAllocations instead (see delivery_note.ts).
            discountAllocations {
              allocatedAmountSet {
                shopMoney {
                  amount
                }
              }
            }
            taxLines {
              rate
              ratePercentage
              priceSet {
                shopMoney {
                  amount
                }
              }
            }
            variant {
              sku
            }
          }
        }
      }
    }
  }
`;
