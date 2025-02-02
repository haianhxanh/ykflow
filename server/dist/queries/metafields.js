"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metaobjectUpdateMutation = exports.metaobjectsQuery = exports.shopMetafieldQuery = exports.metafieldsSetMutation = void 0;
const graphql_request_1 = require("graphql-request");
exports.metafieldsSetMutation = (0, graphql_request_1.gql) `
  mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields {
        key
        namespace
        value
        createdAt
        updatedAt
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;
exports.shopMetafieldQuery = (0, graphql_request_1.gql) `
  query ($namespace: String!, $key: String!) {
    shop {
      id
      metafield(namespace: $namespace, key: $key) {
        id
        value
      }
    }
  }
`;
exports.metaobjectsQuery = (0, graphql_request_1.gql) `
  query ($query: String!, $type: String!) {
    metaobjects(query: $query, type: $type, first: 1) {
      edges {
        node {
          id
          fields {
            key
            value
          }
        }
      }
    }
  }
`;
exports.metaobjectUpdateMutation = (0, graphql_request_1.gql) `
  mutation UpdateMetaobject($id: ID!, $metaobject: MetaobjectUpdateInput!) {
    metaobjectUpdate(id: $id, metaobject: $metaobject) {
      metaobject {
        handle
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;
