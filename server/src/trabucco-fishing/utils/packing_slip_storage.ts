import { GraphQLClient, gql } from "graphql-request";

// Order metafield (list.link) holding every issued packing slip: { text: "YYYY-MM-DD", url }.
export const PACKING_LISTS_NAMESPACE = "custom";
export const PACKING_LISTS_KEY = "packing_lists";

type PackingListLink = { text: string; url: string };

const stagedUploadsCreate = gql`
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

const fileCreate = gql`
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

const fileStatusQuery = gql`
  query FileStatus($id: ID!) {
    node(id: $id) {
      ... on GenericFile {
        fileStatus
        url
      }
    }
  }
`;

const orderLinksQuery = gql`
  query OrderPackingLists($id: ID!, $namespace: String!, $key: String!) {
    order(id: $id) {
      metafield(namespace: $namespace, key: $key) {
        value
      }
    }
  }
`;

const metafieldsSet = gql`
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

const assertNoUserErrors = (label: string, userErrors: { message: string }[] | undefined) => {
  if (userErrors?.length) {
    throw new Error(`${label}: ${userErrors.map((e) => e.message).join("; ")}`);
  }
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Uploads the PDF to Shopify Files and returns its public CDN URL (unguessable hash in the path).
export const uploadPdfToShopifyFiles = async (client: GraphQLClient, filename: string, pdf: Buffer): Promise<string> => {
  const staged: any = await client.request(stagedUploadsCreate, {
    input: [{ resource: "FILE", filename, mimeType: "application/pdf", httpMethod: "POST", fileSize: String(pdf.length) }],
  });
  assertNoUserErrors("stagedUploadsCreate", staged.stagedUploadsCreate.userErrors);
  const target = staged.stagedUploadsCreate.stagedTargets[0];

  const form = new FormData();
  for (const p of target.parameters as { name: string; value: string }[]) form.append(p.name, p.value);
  form.append("file", new Blob([new Uint8Array(pdf)], { type: "application/pdf" }), filename);
  const upload = await fetch(target.url, { method: "POST", body: form });
  if (!upload.ok) throw new Error(`Staged upload failed: HTTP ${upload.status}`);

  const created: any = await client.request(fileCreate, {
    files: [{ contentType: "FILE", originalSource: target.resourceUrl, filename }],
  });
  assertNoUserErrors("fileCreate", created.fileCreate.userErrors);
  const fileId = created.fileCreate.files[0].id as string;

  for (let attempt = 0; attempt < 30; attempt++) {
    const status: any = await client.request(fileStatusQuery, { id: fileId });
    const node = status.node;
    if (node?.fileStatus === "READY" && node.url) return node.url as string;
    if (node?.fileStatus === "FAILED") throw new Error("Shopify file processing failed");
    await sleep(1000);
  }
  throw new Error("Timed out waiting for Shopify file to become READY");
};

// Read-modify-write on the list.link metafield. Not atomic: two concurrent calls for the same
// order can lose one entry, so callers should not run this in parallel for one order.
export const appendPackingListLink = async (client: GraphQLClient, orderGid: string, link: PackingListLink) => {
  const current: any = await client.request(orderLinksQuery, {
    id: orderGid,
    namespace: PACKING_LISTS_NAMESPACE,
    key: PACKING_LISTS_KEY,
  });
  const raw = current.order?.metafield?.value;
  const existing: PackingListLink[] = raw ? JSON.parse(raw) : [];
  const next = [...existing, link];

  const result: any = await client.request(metafieldsSet, {
    metafields: [
      {
        ownerId: orderGid,
        namespace: PACKING_LISTS_NAMESPACE,
        key: PACKING_LISTS_KEY,
        type: "list.link",
        value: JSON.stringify(next),
      },
    ],
  });
  assertNoUserErrors("metafieldsSet", result.metafieldsSet.userErrors);
  return next;
};
