# yeskrabickyflow

Backend and admin tooling for the **Yes Krabičky** Shopify store. The same backend also serves two
other Shopify stores (**Trabucco Fishing** and **Yes Mě**), each with its own credentials.

## Repository layout

| Path | What it is | Status |
| --- | --- | --- |
| `server/` | Express + TypeScript API: Shopify integrations, checkout validations, exports, bulk jobs, emails | **Active** |
| `server/src/trabucco-fishing/` | Trabucco Fishing store: product import, inventory/catalog sync, packing slips. Mounted at `/trabucco`. See its [README](server/src/trabucco-fishing/README.md) | Active |
| `server/src/yesme/` | Yes Mě store: B2B draft orders, weekly order and packing-list exports. Mounted at `/yesme` | Active |
| `server/src/programs-repricing/` | Program (meal plan) price updates, used with the `yk-programs-repricing` cart transform. See its [README](server/src/programs-repricing/README.md) | Active |
| `client/` | Next.js (pages router) admin for customer inquiries ("požadavky") | Legacy |

## Server

### Stack

- Node.js (developed on Node 24), TypeScript, Express 4
- PostgreSQL via Sequelize (models in `server/src/model/`)
- Shopify Admin GraphQL API (queries in `server/src/queries/`), plus `shopify-api-node`
- Mandrill (Mailchimp Transactional) for email, `exceljs` / `pdfkit` for exports
- Google Geocoding (address validation), Microsoft Graph / SharePoint (menu spreadsheet)

### Local setup

```bash
cd server
npm install
cp .env.example .env   # fill in real values, see below
npm run compile        # tsc + copies fonts into dist/
npm start              # nodemon dist/app.js
```

For development, run `npm run build` (`tsc -w`) in one terminal and `npm start` in another.
The server listens on `PORT` (default in the example: `11000`).

Notes:

- The server **runs from `dist/`**, so always compile after changing `src/`. `dist/` is currently
  committed to git.
- On startup it runs `db.sync({ alter: true })`, which alters database tables to match the
  Sequelize models. Keep this in mind before changing a model.
- The database connection requires SSL (`rejectUnauthorized: true`), so a plain local Postgres
  without SSL won't connect without changing `server/src/database_connection/db_connect.ts`.

### Environment variables

All variables are listed in [`server/.env.example`](server/.env.example). Groups:

| Group | Variables | Purpose |
| --- | --- | --- |
| App | `PORT`, `API_VERSION`, `APP_SECRET_KEY` | Port, Shopify API version, bearer key checked by `auth` middleware |
| Database | `DEV_DB_HOST`, `DEV_DB_NAME`, `DEV_DB_USERNAME`, `DEV_DB_PASSWORD` | PostgreSQL (used in every environment despite the `DEV_` prefix) |
| Yes Krabičky Shopify | `STORE`, `ACCESS_TOKEN`, `COLLECTION_PROGRAMS_ID` | Main store Admin API access |
| Trabucco Shopify | `TRABUCCO_STORE`, `TRABUCCO_ACCESS_TOKEN` | Trabucco Fishing store |
| Yes Mě Shopify | `YESME_STORE`, `YESME_ACCESS_TOKEN`, `YESME_API_VERSION`, `YESME_STOREFRONT_KEY`, `YESME_EXPORT_KEY`, `YESME_APP_CLIENT_ID`, `YESME_APP_CLIENT_SECRET` | Yes Mě store, storefront auth, export auth, admin-app session token verification |
| Email | `MANDRILL_*`, `ORDER_EXPORT_RECIPIENTS`, `YESME_MANDRILL_*`, `YESME_ORDER_EXPORT_RECIPIENTS`, `YESME_PACKING_LIST_RECIPIENTS` | Senders, BCC, export recipients |
| Google | `GOOGLE_GEOCODING_API_KEY` | Checkout address validation |
| Pickup locations | `LOCATIONS_XML_FILE` | XML feed(s) of pickup points |
| SharePoint | `TENANT_ID`, `CLIENT_ID`, `CLIENT_SECRET`, `SHAREPOINT_HOSTNAME`, `SITE_PATH`, `EXCEL_FILE_NAME`, `WORKSHEET_NAME` | Reading the menu/recipe spreadsheet |

Never commit `.env`. It's gitignored.

### Hosting

The server and the admin frontend are hosted on **Render** (`yeskrabickyflow-api.onrender.com`). Allowed CORS origins are hardcoded in
`server/src/app.ts`. Add new storefront or admin domains there.


### Endpoints

Main routes are in [`server/src/routes/inquiry.route.ts`](server/src/routes/inquiry.route.ts).
Store-specific routes are in `server/src/trabucco-fishing/trabucco.route.ts` and
`server/src/yesme/yesme.route.ts`. All requests have a 5-minute timeout. Long jobs reply
immediately and continue in the background, logging to the console.

**Inquiries (customer requests about orders)**

| Method & path | Auth | Notes |
| --- | --- | --- |
| `POST /inquiry/new` | public | Called by the theme form |
| `GET /inquiries`, `PUT /inquiry/update`, `POST /inquiry/delete` | `APP_SECRET_KEY` | Used by the admin client |
| `GET /order-inquiries` | public | Inquiries for an order |

**Checkout and storefront** (called from the store, must stay public)

- `POST /checkout/address/validation`, `GET /express-checkout/address-validation/request`
- `GET /checkout/pickup/availability/check`
- `POST /programs/start-date/validation`
- `POST /meal/rating`, `POST /recipe/rating/create`, `POST /campaigns/fuck-cancer` (charity campaign)

**Orders, products and inventory** (admin jobs, usually triggered manually or by Shopify Flow)

- `GET /fulfill`, `GET /order/update/attributes`
- `POST /notification/order-preparation-time`, `POST /custom/email`
- `GET /products/location/activate`, `GET /products/locations/activate`,
  `GET /products/inventory/locations/set`: bulk inventory activation at locations
- `GET /variants/toggle-campaign-data`, `GET /brainmarkets/products/import`
- `GET /menu/read`, `GET /azure/get-spreadsheet-data`: menu from SharePoint
- `POST /programs/campaign/pricing/update`, `GET /programs/new-price/update`,
  `GET /programs/non-standard/price/update`: see programs-repricing README

**Exports** (return or email `.xlsx` files)

- `GET /orders/export`, `GET /orders/district/export`, `GET /products/export`
- `GET /reviews/export`, `GET /reviews/rewards/export`
- `GET /exports/upsell-performance`, `GET /exports/programs`, `GET /exports/gift-cards-balance-report`
- One-off scripts in `controllers/one-off/`: `GET /tag/users`, `GET /exports/npfabinipanevgift-report`

**Trabucco Fishing** (`/trabucco/...`): see [its README](server/src/trabucco-fishing/README.md).

**Yes Mě** (`/yesme/...`)

| Method & path | Auth | Notes |
| --- | --- | --- |
| `POST /yesme/draft-order/create` | storefront key | B2B draft orders from the storefront |
| `GET /yesme/orders/export` | `YESME_EXPORT_KEY` or admin-app session token | Weekly order export, emailed to `YESME_ORDER_EXPORT_RECIPIENTS` |
| `GET /yesme/orders/packing-lists` | same | Delivery notes (dodací listy), emailed to `YESME_PACKING_LIST_RECIPIENTS` |

The Yes Mě export runs every **Thursday at 13:05**. It covers deliveries from the nearest Sunday
through the following Friday. It can also be triggered by the export buttons in the
`yesme-b2b-management` Shopify admin app.

### Scheduled / external triggers

The server has no internal cron. Recurring jobs run from outside, through Shopify Flow or an
external scheduler calling the URL. For example:

- Yes Mě order and packing-list export (Thursdays 13:05)
- Trabucco inventory, catalog and stock-metafield syncs
- Shopify Flow updating `shop.metafields.custom.current_time` every 10 min (programs repricing)

