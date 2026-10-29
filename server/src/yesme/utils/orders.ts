import dotenv from "dotenv";
import { GraphQLClient } from "graphql-request";
import { promisify } from "util";
import { yesmeOrdersExportQuery } from "../queries/orders";

dotenv.config();

// Shared by the orders export and the packing lists, so both always cover exactly the same orders.

const { YESME_STORE, YESME_ACCESS_TOKEN, YESME_API_VERSION, API_VERSION } = process.env;
const API = YESME_API_VERSION || API_VERSION;
export const PRAGUE_TZ = "Europe/Prague";
const DISALLOWED_FINANCIAL_STATUSES = ["VOIDED", "EXPIRED", "REFUNDED"];
const sleep = promisify(setTimeout);

export const yesmeClient = () => {
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

export type DeliveryWindow = { start: string; end: string };

// Resolves ?date into the delivery window. Without a date it only runs on Thursday (Shopify Flow
// trigger day); on other days it returns `skipped` so an accidental trigger does nothing.
export const resolveDeliveryWindow = (
  rawQueryDate: unknown,
): { error: string } | { skipped: true; today: string } | DeliveryWindow => {
  const rawDate = typeof rawQueryDate === "string" ? rawQueryDate.trim() : "";
  const dateParam = rawDate ? parseDateParam(rawDate) : "";
  if (rawDate && !dateParam) return { error: "date must be YYYY-MM-DD or D.M.YYYY" };

  const referenceYmd = dateParam || pragueTodayYmd();
  if (!dateParam && !isThursday(referenceYmd)) return { skipped: true, today: referenceYmd };

  return deliveryWindow(referenceYmd);
};

export const fetchOrders = async (client: GraphQLClient, start: string, end: string) => {
  // status:open = not archived (closed) and not cancelled.
  const query = `status:open AND metafields.delivery.date:>=${start} AND metafields.delivery.date:<=${end}`;
  let cursor: string | null = null;
  let hasNextPage = true;
  const orders: any[] = [];

  while (hasNextPage) {
    const data: any = await client.request(yesmeOrdersExportQuery, { query, cursor });
    const page = data?.orders;
    for (const edge of page?.edges || []) {
      orders.push(edge.node);
    }
    hasNextPage = Boolean(page?.pageInfo?.hasNextPage);
    cursor = page?.pageInfo?.endCursor || null;
    if (hasNextPage) await sleep(300);
  }

  return orders.filter((order) => {
    if (order?.cancelledAt || order?.closed) return false;
    if (DISALLOWED_FINANCIAL_STATUSES.includes(order?.displayFinancialStatus)) return false;
    const deliveryYmd = parseDeliveryDate(order?.deliveryDate?.jsonValue);
    return Boolean(deliveryYmd && deliveryYmd >= start && deliveryYmd <= end);
  });
};

export const pragueTodayYmd = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: PRAGUE_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

const ymdToUtcDate = (ymd: string) => {
  const [year, month, day] = ymd.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
};

const formatYmd = (date: Date) => date.toISOString().slice(0, 10);

const addDays = (ymd: string, days: number) => {
  const date = ymdToUtcDate(ymd);
  date.setUTCDate(date.getUTCDate() + days);
  return formatYmd(date);
};

const weekdayUtc = (ymd: string) => ymdToUtcDate(ymd).getUTCDay();

const isThursday = (ymd: string) => weekdayUtc(ymd) === 4;

// Sunday that closes the reference date's Mon–Sun week, through the following Friday.
// e.g. Thursday 2026-09-17 → Sunday 2026-09-20 … Friday 2026-09-25.
const deliveryWindow = (referenceYmd: string): DeliveryWindow => {
  const daysToSunday = (7 - weekdayUtc(referenceYmd)) % 7;
  const start = addDays(referenceYmd, daysToSunday);
  return { start, end: addDays(start, 5) };
};

const parseDateParam = (value: string): string | null => {
  const ymd = parseDeliveryDate(value);
  if (!ymd || !/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  return formatYmd(ymdToUtcDate(ymd)) === ymd ? ymd : null;
};

export const isoToYmd = (iso?: string) => {
  if (!iso) return "";
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: PRAGUE_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
};

export const parseDeliveryDate = (raw: unknown): string | null => {
  if (raw == null || raw === "") return null;
  const value = String(raw).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(value)) return value.slice(0, 10);

  const match = value.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
  if (!match) return null;
  const day = match[1].padStart(2, "0");
  const month = match[2].padStart(2, "0");
  const year = match[3].length === 2 ? `20${match[3]}` : match[3];
  return `${year}-${month}-${day}`;
};

// Excel stores dates without a timezone; build them at UTC midnight so the cell shows the same calendar
// day regardless of the server's timezone (local midnight in Prague would show the previous day).
export const toExcelDate = (ymd: string) => {
  if (!ymd) return "";
  const [year, month, day] = ymd.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
};

export const czechSlashDate = (ymd: string) => {
  const [year, month, day] = ymd.split("-");
  return `${Number(day)}.${Number(month)}.${year}`;
};

export const street = (address: any) => {
  if (!address) return "";
  return [address.address1, address.address2].filter((part: string) => Boolean(part && String(part).trim())).join(" ");
};

export const zip = (value?: string) => (value ? String(value).replace(/\s/g, "") : "");

export const countryName = (address: any) => {
  const code = address?.countryCodeV2;
  if (code === "CZ") return "Česko";
  if (code === "SK") return "Slovensko";
  return address?.country || "";
};

export const metafieldText = (value: unknown) => {
  if (value == null || value === "") return "";
  return String(value);
};
