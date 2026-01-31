"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.productVariantDeleteQuery = exports.productVariantUpdateQuery = exports.productVariantsBulkCreateQuery = exports.productVariantsBulkUpdate = exports.variantsByQuery = exports.variantByIdQuery = void 0;
const graphql_request_1 = require("graphql-request");
exports.variantByIdQuery = (0, graphql_request_1.gql) `
  query productVariant($variantGid: ID!) {
    productVariant(id: $variantGid) {
      id
      metafields(first: 10, namespace: "campaign") {
        edges {
          node {
            id
            key
            value
          }
        }
      }
      title
      sku
      product {
        title
        tags
      }
    }
  }
`;
exports.variantsByQuery = (0, graphql_request_1.gql) `
  query variantsByQuery($query: String!, $first: Int) {
    productVariants(query: $query, first: $first) {
      edges {
        node {
          id
          sku
          price
          metafield(namespace: "custom", key: "progressive_price") {
            value
          }
        }
      }
    }
  }
`;
exports.productVariantsBulkUpdate = (0, graphql_request_1.gql) `
  mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
    productVariantsBulkUpdate(productId: $productId, variants: $variants) {
      product {
        id
      }
      productVariants {
        id
      }
      userErrors {
        field
        message
      }
    }
  }
`;
exports.productVariantsBulkCreateQuery = (0, graphql_request_1.gql) `
  mutation ProductVariantsCreate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
    productVariantsBulkCreate(productId: $productId, variants: $variants) {
      productVariants {
        id
        title
        selectedOptions {
          name
          value
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;
exports.productVariantUpdateQuery = (0, graphql_request_1.gql) `
  mutation productVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
    productVariantsBulkUpdate(productId: $productId, variants: $variants) {
      product {
        id
      }
      productVariants {
        id
      }
      userErrors {
        field
        message
      }
    }
  }
`;
exports.productVariantDeleteQuery = (0, graphql_request_1.gql) `
  mutation bulkDeleteProductVariants($productId: ID!, $variantsIds: [ID!]!) {
    productVariantsBulkDelete(productId: $productId, variantsIds: $variantsIds) {
      product {
        id
        title
      }
      userErrors {
        field
        message
      }
    }
  }
`;
