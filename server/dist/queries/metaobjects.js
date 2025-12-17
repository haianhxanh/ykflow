"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.metaobjectUpsertMutation = exports.metaobjectUpdateMutation = exports.metaobjectByHandleQuery = exports.metaobjectsQuery = void 0;
const graphql_request_1 = require("graphql-request");
exports.metaobjectsQuery = (0, graphql_request_1.gql) `
  query Metaobjects($type: String!) {
    metaobjects(type: $type, first: 250) {
      nodes {
        handle
      }
    }
  }
`;
exports.metaobjectByHandleQuery = (0, graphql_request_1.gql) `
  query MetaobjectByHandle($handle: MetaobjectHandleInput!) {
    metaobjectByHandle(handle: $handle) {
      id
      handle
      capabilities {
        publishable {
          status
        }
      }
      fields {
        type
        key
        value
      }
    }
  }
`;
exports.metaobjectUpdateMutation = (0, graphql_request_1.gql) `
  mutation MetaobjectUpdate($id: ID!, $metaobject: MetaobjectUpdateInput!) {
    metaobjectUpdate(id: $id, metaobject: $metaobject) {
      metaobject {
        handle
      }
    }
  }
`;
exports.metaobjectUpsertMutation = (0, graphql_request_1.gql) `
  mutation UpsertMetaobject($handle: MetaobjectHandleInput!, $metaobject: MetaobjectUpsertInput!) {
    metaobjectUpsert(handle: $handle, metaobject: $metaobject) {
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
