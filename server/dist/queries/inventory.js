"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inventoryItemUpdate = exports.inventorySetQuantities = exports.inventoryBulkToggleActivation = void 0;
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
exports.inventorySetQuantities = (0, graphql_request_1.gql) `
  mutation InventorySet($input: InventorySetQuantitiesInput!) {
    inventorySetQuantities(input: $input) {
      inventoryAdjustmentGroup {
        createdAt
        reason
        referenceDocumentUri
        changes {
          name
          delta
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;
exports.inventoryItemUpdate = (0, graphql_request_1.gql) `
  mutation inventoryItemUpdate($id: ID!, $input: InventoryItemInput!) {
    inventoryItemUpdate(id: $id, input: $input) {
      inventoryItem {
        id
        tracked
      }
      userErrors {
        message
      }
    }
  }
`;
