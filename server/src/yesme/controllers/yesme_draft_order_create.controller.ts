import { Request, Response } from "express";
import { GraphQLClient } from "graphql-request";
import dotenv from "dotenv";
import { yesmeCustomerQuery, yesmeDraftOrderCreateMutation } from "../queries/draftOrders";

dotenv.config();

const { YESME_STORE, YESME_ACCESS_TOKEN, YESME_API_VERSION, API_VERSION } = process.env;
const API = YESME_API_VERSION || API_VERSION;

type CartLine = {
  variantId?: string | number;
  quantity?: number;
  b2bPrice?: string | number | null;
  properties?: Record<string, string | null>;
};

const toGid = (type: string, id?: string | number | null) => {
  if (id === undefined || id === null || id === "") return null;
  const value = String(id);
  if (value.startsWith("gid://")) return value;
  return `gid://shopify/${type}/${value}`;
};

const yesmeClient = () => {
  if (!YESME_STORE || !YESME_ACCESS_TOKEN) {
    throw new Error("YESME_STORE or YESME_ACCESS_TOKEN is not configured");
  }

  return new GraphQLClient(`https://${YESME_STORE}/admin/api/${API}/graphql.json`, {
    // @ts-ignore
    headers: {
      "X-Shopify-Access-Token": YESME_ACCESS_TOKEN,
    },
  });
};

const lineB2bPrice = (line: CartLine) => {
  const fromProp = line.properties && line.properties._b2b_price;
  const raw = line.b2bPrice ?? fromProp;
  if (raw === undefined || raw === null || raw === "") return null;
  const amount = Number(raw);
  if (!Number.isFinite(amount)) return null;
  return String(raw);
};

const presentmentCurrency = (raw?: string) => {
  const code = String(raw || "CZK").toUpperCase();
  if (code === "EUR" || code === "CZK") return code;
  return "CZK";
};

const toAttributes = (raw?: Record<string, unknown> | null) => {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return [];

  return Object.entries(raw)
    .filter(([, value]) => value !== undefined && value !== null && String(value).trim() !== "")
    .map(([key, value]) => ({ key: String(key), value: String(value) }));
};

export const yesme_draft_order_create = async (req: Request, res: Response) => {
  try {
    const { items, attributes, currency, customerId, email, companyId, locationId, note } = req.body || {};
    const lines: CartLine[] = Array.isArray(items) ? items : [];

    if (!lines.length) {
      return res.status(400).json({ message: "Cart items are required" });
    }

    const currencyCode = presentmentCurrency(currency);
    const lineItems = lines
      .map((line) => {
        const variantId = toGid("ProductVariant", line.variantId);
        const quantity = Number(line.quantity) || 0;
        if (!variantId || quantity < 1) return null;

        const item: Record<string, unknown> = { variantId, quantity };
        const b2bPrice = lineB2bPrice(line);
        const customAttributes = toAttributes(line.properties || {});

        if (b2bPrice !== null) {
          item.priceOverride = { amount: b2bPrice, currencyCode };
          if (!customAttributes.some((attribute) => attribute.key === "_b2b_price")) {
            customAttributes.push({ key: "_b2b_price", value: b2bPrice });
          }
        }

        if (customAttributes.length) {
          item.customAttributes = customAttributes;
        }
        return item;
      })
      .filter(Boolean);

    if (!lineItems.length) {
      return res.status(400).json({ message: "No valid cart line items" });
    }

    const client = yesmeClient();
    const customerGid = toGid("Customer", customerId);
    const companyGid = toGid("Company", companyId);
    const locationGid = toGid("CompanyLocation", locationId);

    let taxExempt = false;
    let companyContactId: string | null = null;
    if (customerGid) {
      try {
        const customerData: any = await client.request(yesmeCustomerQuery, { id: customerGid });
        taxExempt = Boolean(customerData?.customer?.taxExempt);
        const profiles = customerData?.customer?.companyContactProfiles || [];
        const match = companyGid
          ? profiles.find((profile: any) => profile?.company?.id === companyGid)
          : profiles[0];
        companyContactId = match?.id || null;
      } catch (error) {
        console.error("yesme customer lookup failed", error);
      }
    }

    const cartAttributes = toAttributes(attributes);
    const input: Record<string, unknown> = {
      lineItems,
      presentmentCurrencyCode: currencyCode,
      tags: ["yesme-storefront"],
      note: note || undefined,
      email: email || undefined,
      taxExempt,
    };

    if (cartAttributes.length) {
      input.customAttributes = cartAttributes;
    }

    const isB2b = Boolean(companyGid && locationGid && companyContactId);
    if (isB2b) {
      input.purchasingEntity = {
        purchasingCompany: {
          companyId: companyGid,
          companyLocationId: locationGid,
          companyContactId,
        },
      };
    } else if (customerGid) {
      input.customerId = customerGid;
      input.useCustomerDefaultAddress = true;
    }

    const result: any = await client.request(yesmeDraftOrderCreateMutation, { input });
    const payload = result?.draftOrderCreate;
    const userErrors = payload?.userErrors || [];
    if (userErrors.length || !payload?.draftOrder?.invoiceUrl) {
      return res.status(400).json({
        message: userErrors[0]?.message || "Draft order could not be created",
        userErrors,
      });
    }

    return res.status(200).json({
      id: payload.draftOrder.id,
      name: payload.draftOrder.name,
      invoiceUrl: payload.draftOrder.invoiceUrl,
      currency: payload.draftOrder.presentmentCurrencyCode,
    });
  } catch (error: any) {
    console.error("yesme_draft_order_create failed", error);
    const graphQLErrors = error?.response?.errors;
    return res.status(500).json({
      message: graphQLErrors?.[0]?.message || error?.message || "Draft order create failed",
    });
  }
};
