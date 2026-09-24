# trabucco-fishing

Backend functionality for the trabucco-fishing spinoff store. Same backend/process as yeskrabicky,
different Shopify store — uses its own credentials (`TRABUCCO_STORE`, `TRABUCCO_ACCESS_TOKEN`) rather
than the shared `STORE`/`ACCESS_TOKEN` used elsewhere in this app.

## Structure

- `controllers/` — brand-specific controllers (product import, inventory sync, etc.)
- `data/` — brand-specific data files (preferred-items lists, mapping files, etc.)
- `trabucco.route.ts` — routes for this brand, mounted at `/trabucco` in `app.ts`

## Locations

- Průmyslová: `gid://shopify/Location/72378614056`
- Externí sklad: `gid://shopify/Location/114033066280`
- (`Výchozí sklad` from the feed is always 0 and intentionally ignored everywhere)

## Endpoints

### `GET /trabucco/products/import`

One-time bulk import from the full Shoptet product export. Already run for the initial catalog
(~4,920 products). Status/draft rules, category tagging, and variant handling are documented inline
in `trabucco_products_import.controller.ts`.

### `GET /trabucco/products/inventory-sync?feedUrl=...&update_metafields=true`

Ongoing sync from the Mergado feed (defaults to the live Trabucco Mergado XML if `feedUrl` is
omitted). Matches feed `CODE` to a Shopify variant by SKU. Per item:

- Sets inventory at Průmyslová + Externí sklad from `STOCK/WAREHOUSES/WAREHOUSE`
- `VISIBILITY = hidden` → unpublish the product from all sales channels
- `VISIBILITY = visible` → set the product status to ACTIVE and publish to Online Store
- If `update_metafields=true`: also writes three variant metafields — `stock.internal`
  (number_integer) = Průmyslová quantity, `stock.available_in_cz` (boolean) = whether that quantity
  is > 0, `stock.external` (number_integer) = Externí sklad quantity. Definitions already exist on
  the store (created outside this repo).

Responds `202` immediately and processes in the background (fully sequential — no concurrency),
since a full run against ~1,000 items takes several minutes and would otherwise exceed the app's
request timeout middleware. Intended to be triggered periodically by an external scheduler (e.g.
Shopify Flow or a cron hitting the URL), not called synchronously from a user-facing flow. Progress
and errors are logged to the console only; there's no persisted run history yet.

Note: this Mergado feed is a flat structure (no nested `VARIANTS/VARIANT` like the full product
export) and covers a smaller subset (~1,048 items) of the catalog — it appears to be a
marketing/comparison-shopping feed rather than the complete product export.

### `GET /trabucco/products/catalog-variant-sync`

Syncs each **variant's** publication state on the B2C catalog (`Catalog "B2C"`,
`gid://shopify/MarketCatalog/161522811176`, publication `gid://shopify/Publication/312649089320`)
to its available inventory at Průmyslová:

- available ≤ 0 → unpublish the variant from that catalog
- available > 0 → publish the variant back to that catalog

This is variant-level only (`publishablePublish`/`publishableUnpublish` called with the
`ProductVariant` id) — the parent product's own status/publication is never touched, and other
variants of the same product are unaffected. Requires Admin API **2026-07+**, since
`ProductVariant` only became `Publishable` in that version — this endpoint pins its own client to
`2026-07` rather than using the shared `API_VERSION` (currently `2025-01`) so the rest of the brand's
endpoints aren't affected.

Full sweep of all variants every run (no persisted state), skipping any variant already in the
correct publish state. Same 202-then-background pattern as `inventory-sync`, for the same reason
(full sweep of ~7,600 variants exceeds the request timeout).

Note: this publication has `autoPublish: true` — every variant is published by default with no
explicit `resourcePublicationsV2` record until it's been touched. The controller treats "no record"
as "currently published" accordingly; treating it as unpublished would silently skip unpublishing
untouched out-of-stock variants.

### `GET /trabucco/products/stock-metafields-sync`

One-off full sweep, equivalent to the `Sync variant stock metafields by location` Shopify Flow
(triggered there per `inventory_quantity_changed` event) but run once across every variant instead.
For each variant, reads available inventory at Průmyslová and sets:

- `stock.internal` (number_integer) = that quantity
- `stock.available_in_cz` (boolean) = whether that quantity is > 0

Same 202-then-background full-sweep pattern as `catalog-variant-sync`. Does not touch
`stock.external` (Externí sklad) — that's covered by `inventory-sync?update_metafields=true` instead.

### `GET|POST /trabucco/orders/delivery-note?orderId=...`

Builds a printable PDF dodací list from a Trabucco Shopify order. Accepts `orderId` as a GraphQL
id (`gid://shopify/Order/123`), a numeric id, query param, or JSON body (`{ "orderId": "..." }`).
Does not send email — returns the PDF as a download. `?format=json` returns the Mandrill-ready
attachment payload `{ type, name, content }` (base64) for wiring up later.

The Sleva column is always a percentage (`15 %`). Line prices are shown without VAT; DPH and
gross are derived from the order's tax lines. Seller on the document is SR TRADING, s.r.o.
(Trabucco Fish). The Trabucco Admin token needs the `read_orders` scope.
