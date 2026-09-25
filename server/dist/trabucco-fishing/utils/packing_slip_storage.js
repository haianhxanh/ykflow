"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.appendPackingListLink = exports.uploadPdfToShopifyFiles = exports.PACKING_LISTS_KEY = exports.PACKING_LISTS_NAMESPACE = void 0;
const graphql_request_1 = require("graphql-request");
// Order metafield (list.link) holding every issued packing slip: { text: "YYYY-MM-DD", url }.
exports.PACKING_LISTS_NAMESPACE = "custom";
exports.PACKING_LISTS_KEY = "packing_lists";
const stagedUploadsCreate = (0, graphql_request_1.gql) `
  mutation StagedUploads($input: [StagedUploadInput!]!) {
    stagedUploadsCreate(input: $input) {
      stagedTargets {
        url
        resourceUrl
        parameters {
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
const fileCreate = (0, graphql_request_1.gql) `
  mutation FileCreate($files: [FileCreateInput!]!) {
    fileCreate(files: $files) {
      files {
        id
      }
      userErrors {
        field
        message
      }
    }
  }
`;
const fileStatusQuery = (0, graphql_request_1.gql) `
  query FileStatus($id: ID!) {
    node(id: $id) {
      ... on GenericFile {
        fileStatus
        url
      }
    }
  }
`;
const orderLinksQuery = (0, graphql_request_1.gql) `
  query OrderPackingLists($id: ID!, $namespace: String!, $key: String!) {
    order(id: $id) {
      metafield(namespace: $namespace, key: $key) {
        value
      }
    }
  }
`;
const metafieldsSet = (0, graphql_request_1.gql) `
  mutation SetMetafields($metafields: [MetafieldsSetInput!]!) {
    metafieldsSet(metafields: $metafields) {
      metafields {
        id
      }
      userErrors {
        field
        message
        code
      }
    }
  }
`;
const assertNoUserErrors = (label, userErrors) => {
    if (userErrors === null || userErrors === void 0 ? void 0 : userErrors.length) {
        throw new Error(`${label}: ${userErrors.map((e) => e.message).join("; ")}`);
    }
};
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
// Uploads the PDF to Shopify Files and returns its public CDN URL (unguessable hash in the path).
const uploadPdfToShopifyFiles = (client, filename, pdf) => __awaiter(void 0, void 0, void 0, function* () {
    const staged = yield client.request(stagedUploadsCreate, {
        input: [{ resource: "FILE", filename, mimeType: "application/pdf", httpMethod: "POST", fileSize: String(pdf.length) }],
    });
    assertNoUserErrors("stagedUploadsCreate", staged.stagedUploadsCreate.userErrors);
    const target = staged.stagedUploadsCreate.stagedTargets[0];
    const form = new FormData();
    for (const p of target.parameters)
        form.append(p.name, p.value);
    form.append("file", new Blob([new Uint8Array(pdf)], { type: "application/pdf" }), filename);
    const upload = yield fetch(target.url, { method: "POST", body: form });
    if (!upload.ok)
        throw new Error(`Staged upload failed: HTTP ${upload.status}`);
    const created = yield client.request(fileCreate, {
        files: [{ contentType: "FILE", originalSource: target.resourceUrl, filename }],
    });
    assertNoUserErrors("fileCreate", created.fileCreate.userErrors);
    const fileId = created.fileCreate.files[0].id;
    for (let attempt = 0; attempt < 30; attempt++) {
        const status = yield client.request(fileStatusQuery, { id: fileId });
        const node = status.node;
        if ((node === null || node === void 0 ? void 0 : node.fileStatus) === "READY" && node.url)
            return node.url;
        if ((node === null || node === void 0 ? void 0 : node.fileStatus) === "FAILED")
            throw new Error("Shopify file processing failed");
        yield sleep(1000);
    }
    throw new Error("Timed out waiting for Shopify file to become READY");
});
exports.uploadPdfToShopifyFiles = uploadPdfToShopifyFiles;
// Read-modify-write on the list.link metafield. Not atomic: two concurrent calls for the same
// order can lose one entry, so callers should not run this in parallel for one order.
const appendPackingListLink = (client, orderGid, link) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const current = yield client.request(orderLinksQuery, {
        id: orderGid,
        namespace: exports.PACKING_LISTS_NAMESPACE,
        key: exports.PACKING_LISTS_KEY,
    });
    const raw = (_b = (_a = current.order) === null || _a === void 0 ? void 0 : _a.metafield) === null || _b === void 0 ? void 0 : _b.value;
    const existing = raw ? JSON.parse(raw) : [];
    const next = [...existing, link];
    const result = yield client.request(metafieldsSet, {
        metafields: [
            {
                ownerId: orderGid,
                namespace: exports.PACKING_LISTS_NAMESPACE,
                key: exports.PACKING_LISTS_KEY,
                type: "list.link",
                value: JSON.stringify(next),
            },
        ],
    });
    assertNoUserErrors("metafieldsSet", result.metafieldsSet.userErrors);
    return next;
});
exports.appendPackingListLink = appendPackingListLink;
