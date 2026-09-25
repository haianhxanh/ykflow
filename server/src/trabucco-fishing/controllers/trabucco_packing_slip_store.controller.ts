import { Request, Response } from "express";
import dotenv from "dotenv";
import { GraphQLClient } from "graphql-request";
import { trabuccoPackingSlipOrderQuery } from "../queries/orders";
import { buildPackingSlipPdf, mapOrderToPackingSlip, packingSlipFilename } from "../utils/packing_slip";
import { appendPackingListLink, uploadPdfToShopifyFiles } from "../utils/packing_slip_storage";
import { toOrderGid } from "./trabucco_packing_slip.controller";

dotenv.config();
const { TRABUCCO_STORE, TRABUCCO_ACCESS_TOKEN, API_VERSION } = process.env;

// Generates the packing slip for an order, stores the PDF in Shopify Files and appends
// { text: "YYYY-MM-DD", url } to the order's custom.packing_lists metafield.
export const trabucco_packing_slip_store = async (req: Request, res: Response) => {
  try {
    const rawId = (req.body?.orderId || req.body?.id || req.query.orderId || req.query.id) as string | undefined;
    if (!rawId) return res.status(400).json({ error: "orderId is required" });

    const client = new GraphQLClient(`https://${TRABUCCO_STORE}/admin/api/${API_VERSION}/graphql.json`, {
      // @ts-ignore
      headers: { "X-Shopify-Access-Token": TRABUCCO_ACCESS_TOKEN },
    });

    const orderGid = toOrderGid(rawId);
    const data = (await client.request(trabuccoPackingSlipOrderQuery, { id: orderGid })) as { order?: any };
    const order = data?.order;
    if (!order) return res.status(404).json({ error: "Order not found" });

    const prague = (d: Date, locale: string) => new Intl.DateTimeFormat(locale, { timeZone: "Europe/Prague" }).format(d);
    const now = new Date();
    const date = prague(now, "sv-SE"); // YYYY-MM-DD, description of the metafield link

    // Filename = numeric order ID (not guessable from the order name) + date of the latest
    // fulfillment, e.g. dodaci-list-7727514583336-20260915.pdf. Falls back to today when the
    // order isn't fulfilled yet (manual generation).
    const fulfilledAt = (order.fulfillments ?? [])
      .map((f: { createdAt: string }) => new Date(f.createdAt))
      .sort((a: Date, b: Date) => b.getTime() - a.getTime())[0] as Date | undefined;
    const fileDate = prague(fulfilledAt ?? now, "sv-SE").replace(/-/g, "");
    const numericId = orderGid.split("/").pop();
    const pdf = await buildPackingSlipPdf(mapOrderToPackingSlip(order));
    const filename = packingSlipFilename(`${numericId}-${fileDate}`);

    const url = await uploadPdfToShopifyFiles(client, filename, pdf);
    const links = await appendPackingListLink(client, orderGid, { text: date, url });

    return res.status(200).json({ order: order.name, url, links });
  } catch (error) {
    console.error("trabucco_packing_slip_store failed", error);
    return res.status(500).json({ error: "Failed to store packing slip" });
  }
};
