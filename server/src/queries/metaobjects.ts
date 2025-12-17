import { gql } from "graphql-request";

export const metaobjectsQuery = gql`
  query Metaobjects($type: String!) {
    metaobjects(type: $type, first: 250) {
      nodes {
        handle
      }
    }
  }
`;

export const metaobjectByHandleQuery = gql`
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

export const metaobjectUpdateMutation = gql`
  mutation MetaobjectUpdate($id: ID!, $metaobject: MetaobjectUpdateInput!) {
    metaobjectUpdate(id: $id, metaobject: $metaobject) {
      metaobject {
        handle
      }
    }
  }
`;

export const metaobjectUpsertMutation = gql`
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
