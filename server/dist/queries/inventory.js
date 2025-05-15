"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inventoryBulkToggleActivation = void 0;
const graphql_request_1 = require("graphql-request");
exports.inventoryBulkToggleActivation = (0, graphql_request_1.gql) `
  mutation inventoryBulkToggleActivation($inventoryItemId: ID!, $inventoryItemUpdates: [InventoryBulkToggleActivationInput!]!) {
    inventoryBulkToggleActivation(inventoryItemId: $inventoryItemId, inventoryItemUpdates: $inventoryItemUpdates) {
      inventoryItem {
        id
      }
      inventoryLevels {
        id
        quantities(names: ["available"]) {
          name
          quantity
        }
        location {
          id
        }
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;
