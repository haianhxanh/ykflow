import { gql } from "graphql-request";

export const variantByIdQuery = gql`
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
      sku
      product {
        tags
      }
    }
  }
`;

export const productVariantsBulkUpdate = gql`
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

export const productVariantsBulkCreateQuery = gql`
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

export const productVariantUpdateQuery = gql`
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

export const productVariantDeleteQuery = gql`
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
