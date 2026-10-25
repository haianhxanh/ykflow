import { Request, Response } from "express";
import dotenv from "dotenv";
import { randomBytes } from "crypto";
import fs from "fs";
import path from "path";
import { GraphQLClient } from "graphql-request";
import { sendYesmeEmail } from "../utils/email";
import { appendPackingListLink, uploadPdfToShopifyFiles } from "../../trabucco-fishing/utils/packing_slip_storage";
import { buildDeliveryNotes, buildDeliveryNotesWorkbook, deliveryNoteFilename, DeliveryNote, XLSX_MIME } from "../utils/delivery_note";
import { czechSlashDate, fetchOrders, pragueTodayYmd, resolveDeliveryWindow, yesmeClient } from "../utils/orders";

dotenv.config();

const { YESME_PACKING_LIST_RECIPIENTS, YESME_ORDER_EXPORT_RECIPIENTS } = process.env;
const STORE_CONCURRENCY = 3;

// Dodací listy for the same Sunday–Friday window and the same orders as the orders export,
// one per závoz (company location + delivery day). Query options mirror the export:
// date, sendEmail=false, download=true, revised=true, plus store=false to skip Shopify Files.
export const yesme_packing_lists = async (req: Request, res: Response) => {
  try {
    const window = resolveDeliveryWindow(req.query.date);
    if ("error" in window) {
      return res.status(400).json({ error: window.error });
    }
    if ("skipped" in window) {
      return res.status(200).json({
        skipped: true,
        reason: "Yes Me packing lists run on Thursday only. Pass ?date=YYYY-MM-DD to override.",
        today: window.today,
      });
    }

    const { start, end } = window;
    const client = yesmeClient();
    const orders = await fetchOrders(client, start, end);
    const notes = buildDeliveryNotes(orders);
    const summary = notes.map((note) => ({
      number: note.number,
      deliveryDate: note.deliveryDate,
      customer: note.customer,
      branch: note.branch,
      orders: note.orderNames,
      totalQuantity: note.totalQuantity,
    }));

    if (!notes.length) {
      return res.status(200).json({ start, end, orders: 0, deliveries: [], emailed: false, stored: [], savedTo: null });
    }

    const shouldStore = req.query.store !== "false";
    const stored = shouldStore ? await storeNotes(client, notes) : [];

    const fileName = `yesme-dodaci-listy-${start}-to-${end}.xlsx`;
    const workbook = await buildDeliveryNotesWorkbook(notes);
    const attachment = { type: XLSX_MIME, name: fileName, content: workbook.toString("base64") };

    const shouldSendEmail = req.query.sendEmail !== "false";
    const isRevisedDoc = req.query.revised === "true";
    const recipientEmails = (YESME_PACKING_LIST_RECIPIENTS || YESME_ORDER_EXPORT_RECIPIENTS) as string;
    if (shouldSendEmail && recipientEmails) {
      try {
        await sendYesmeEmail(
          `Yes Me dodací listy ${start} – ${end}${isRevisedDoc ? " (opravné)" : ""}`,
          recipientEmails,
          `Dodací listy pro závozy ${czechSlashDate(start)} až ${czechSlashDate(end)} (${notes.length}) jsou v příloze.`,
          attachment,
        );
      } catch (error) {
        console.error("yesme_packing_lists: email failed", error);
        return res
          .status(502)
          .json({ start, end, deliveries: summary, stored, emailed: false, error: String((error as Error)?.message || error) });
      }
    }

    // ?download=true also stores the workbook (one sheet per závoz) in the server's working directory (git-ignored).
    const savedTo = req.query.download === "true" ? path.resolve(fileName) : null;
    if (savedTo) fs.writeFileSync(savedTo, new Uint8Array(workbook));

    return res.status(200).json({
      start,
      end,
      orders: orders.length,
      deliveries: summary,
      emailed: Boolean(shouldSendEmail && recipientEmails),
      stored,
      savedTo,
      attachment,
    });
  } catch (error) {
    console.error("yesme_packing_lists failed", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

type StoreResult = { number: string; url?: string; error?: string };

// Uploads each závoz's workbook to Shopify Files and links it on every order in that závoz
// (custom.packing_lists, same as Trabucco). Failures are reported per závoz and never block the email.
const storeNotes = async (client: GraphQLClient, notes: DeliveryNote[]): Promise<StoreResult[]> => {
  const today = pragueTodayYmd();
  const results: StoreResult[] = [];
  for (let index = 0; index < notes.length; index += STORE_CONCURRENCY) {
    const batch = notes.slice(index, index + STORE_CONCURRENCY);
    results.push(
      ...(await Promise.all(
        batch.map(async (note): Promise<StoreResult> => {
          try {
            const file = await buildDeliveryNotesWorkbook([note]);
            // Random suffix keeps the public Shopify CDN URL unguessable.
            const url = await uploadPdfToShopifyFiles(client, deliveryNoteFilename(note, randomBytes(6).toString("hex")), file, XLSX_MIME);
            for (const orderId of note.orderIds) {
              await appendPackingListLink(client, orderId, { text: `${today} (${note.number})`, url });
            }
            return { number: note.number, url };
          } catch (error) {
            console.error(`yesme_packing_lists: storing ${note.number} failed`, error);
            return { number: note.number, error: error instanceof Error ? error.message : String(error) };
          }
        }),
      )),
    );
  }
  return results;
};
