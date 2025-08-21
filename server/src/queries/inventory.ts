import { gql } from "graphql-request";

export const inventoryBulkToggleActivation = gql`
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

export const inventorySetQuantities = gql`
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

export const inventoryItemUpdate = gql`
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
