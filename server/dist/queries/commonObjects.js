"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addTagsMutation = void 0;
const graphql_request_1 = require("graphql-request");
exports.addTagsMutation = (0, graphql_request_1.gql) `
  mutation addTags($id: ID!, $tags: [String!]!) {
    tagsAdd(id: $id, tags: $tags) {
      node {
        id
      }
      userErrors {
        message
      }
    }
  }
`;
