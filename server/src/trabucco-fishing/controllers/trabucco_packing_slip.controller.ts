import { Request, Response } from "express";
import dotenv from "dotenv";
import { GraphQLClient } from "graphql-request";
import { trabuccoPackingSlipOrderQuery } from "../queries/orders";
import { buildPackingSlipPdf, packingSlipFilename, PackingSlipBasis, mapOrderToPackingSlip } from "../utils/packing_slip";

dotenv.config();
const { TRABUCCO_STORE, TRABUCCO_ACCESS_TOKEN, API_VERSION } = process.env;

export const toOrderGid = (raw: string) => {
  const value = raw.trim();
  if (value.startsWith("gid://shopify/Order/")) return value;
  if (/^\d+$/.test(value)) return `gid://shopify/Order/${value}`;
  return value;
};

export const trabucco_packing_slip = async (req: Request, res: Response) => {
  try {
    const rawId = (req.body?.orderId || req.body?.id || req.query.orderId || req.query.id) as string | undefined;
    if (!rawId) {
      return res.status(400).json({ error: "orderId is required" });
    }

    const client = new GraphQLClient(`https://${TRABUCCO_STORE}/admin/api/${API_VERSION}/graphql.json`, {
      // @ts-ignore
      headers: { "X-Shopify-Access-Token": TRABUCCO_ACCESS_TOKEN },
    });

    const data = (await client.request(trabuccoPackingSlipOrderQuery, { id: toOrderGid(rawId) })) as { order?: any };
    const order = data?.order;
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // basis=invoice is a narrow escape hatch for orders whose (mathematically imperfect)
    // Fakturoid invoice has already been sent to the client/accountant, so the packing slip
    // doesn't contradict a document they already have. Defaults to the correct Shopify math.
    const rawBasis = (req.query.basis || req.body?.basis) as string | undefined;
    const basis: PackingSlipBasis = rawBasis === "invoice" ? "invoice" : "shopify";
    const note = mapOrderToPackingSlip(order, basis);
    const pdf = await buildPackingSlipPdf(note);
    const filename = packingSlipFilename(order.name);

    if (req.query.format === "json") {
      return res.status(200).json({
        type: "application/pdf",
        name: filename,
        content: pdf.toString("base64"),
      });
    }

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return res.status(200).send(pdf);
  } catch (error) {
    console.error("trabucco_packing_slip failed", error);
    return res.status(500).json({ error: "Failed to generate packing slip" });
  }
};
