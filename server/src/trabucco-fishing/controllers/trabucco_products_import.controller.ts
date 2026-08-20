import { Request, Response } from "express";
import dotenv from "dotenv";
import { GraphQLClient } from "graphql-request";
import xml_to_js from "xml-js";
import { locationsQuery } from "../../queries/locations";
dotenv.config();
const { TRABUCCO_STORE, TRABUCCO_ACCESS_TOKEN, API_VERSION } = process.env;

// Shoptet warehouse names (productsComplete.xml) -> Shopify location names.
// TODO: confirm final Shopify location names once both locations are created, then update this map.
const WAREHOUSE_TO_LOCATION: Record<string, string> = {
  "Průmyslová": "Průmyslová",
  "Externí sklad": "External location",
};

/*-------------------------------------MAIN FUNCTION------------------------------------------------*/
// Fetch products from Trabucco's Shoptet XML feed (productsComplete.xml)
// Map SHOPITEM -> product, nested VARIANTS/VARIANT (with PARAMETERS) -> Shopify variants
// TODO: product creation loop (see ../../controllers/brainmarkets_products_import.controller.ts for the
//   reference shape: productsQuery to check for existing product by title, productCreateQuery as DRAFT,
//   productOptionsCreateQuery + productVariantsBulkCreateQuery per variant, inventoryBulkToggleActivation
//   to activate at both locations, inventorySetQuantities from stockByWarehouse via WAREHOUSE_TO_LOCATION)
// Still to decide: product status on import, tags, category -> collection mapping, whether the
// wholesale PRICELIST block matters for Shopify, and how to dedupe/re-run imports safely.
/*-------------------------------------MAIN FUNCTION------------------------------------------------*/

export const trabucco_products_import = async (req: Request, res: Response) => {
  try {
    const xmlUrl = req.query.xmlUrl as string;
    const client = new GraphQLClient(`https://${TRABUCCO_STORE}/admin/api/${API_VERSION}/graphql.json`, {
      // @ts-ignore
      headers: {
        "X-Shopify-Access-Token": TRABUCCO_ACCESS_TOKEN,
      },
    });

    const items = await fetchProductsFromXml(xmlUrl);
    const mappedItems = mapItems(items);

    const locations = await client.request(locationsQuery);
    const locationIds = locations.locations.edges.map((location: any) => location.node.id);

    // TODO: create products/variants here (see reference controller above)

    return res.status(200).json({ itemsFound: mappedItems.length, locationsFound: locationIds.length });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const fetchProductsFromXml = async (xmlUrl: string) => {
  const response = await fetch(xmlUrl, {
    method: "GET",
    headers: {
      "Content-Type": "text/xml",
    },
  })
    .then(function (response: any) {
      return response.text();
    })
    .then(function (xml: any) {
      var json_result = xml_to_js.xml2js(xml, { compact: true }) as any;
      return json_result;
    });
  return response?.SHOP?.SHOPITEM;
};

const asArray = (value: any) => (Array.isArray(value) ? value : [value].filter(Boolean));

const mapWarehouseStock = (stock: any) => {
  const warehouses = asArray(stock?.WAREHOUSES?.WAREHOUSE);
  return warehouses.reduce((acc: Record<string, number>, warehouse: any) => {
    const name = warehouse?.NAME?._text;
    const value = Number(warehouse?.VALUE?._text ?? 0);
    if (name) acc[name] = value;
    return acc;
  }, {} as Record<string, number>);
};

const mapVariant = (parentTitle: string, variantSource: any) => {
  const parameters = asArray(variantSource?.PARAMETERS?.PARAMETER);
  const [optionParam] = parameters;
  return {
    productTitle: parentTitle,
    sku: variantSource?.CODE?._text,
    ean: variantSource?.EAN?._text,
    price: variantSource?.PRICE_VAT?._text,
    stockByWarehouse: mapWarehouseStock(variantSource?.STOCK),
    optionName: optionParam?.NAME?._text,
    optionValue: optionParam?.VALUE?._text,
  };
};

const mapItems = (items: any[]) => {
  return items.map((item: any) => {
    const images = asArray(item.IMAGES?.IMAGE);
    const variantSources = item.VARIANTS?.VARIANT ? asArray(item.VARIANTS.VARIANT) : [item];

    return {
      title: item.NAME?._text,
      guid: item.GUID?._text,
      manufacturer: item.MANUFACTURER?._text,
      category: item.CATEGORIES?.DEFAULT_CATEGORY?._text,
      // DESCRIPTION/SHORT_DESCRIPTION are CDATA-wrapped, so xml-js puts them under _cdata, not _text.
      // Present on ~2,381/4,920 products — the rest have neither, so a fallback will be needed on import.
      descriptionHtml: item.DESCRIPTION?._cdata,
      shortDescription: item.SHORT_DESCRIPTION?._cdata,
      images: images.map((image: any) => image._text).filter(Boolean),
      variants: variantSources.map((variant: any) => mapVariant(item.NAME?._text, variant)),
    };
  });
};
