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
