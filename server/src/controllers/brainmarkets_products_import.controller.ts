import { Request, Response } from "express";
import dotenv from "dotenv";
import { GraphQLClient } from "graphql-request";
import { allProductsQuery, productCreateQuery, productOptionsCreateQuery, productsQuery } from "../queries/products";
import { inventoryBulkToggleActivation, inventoryItemUpdate, inventorySetQuantities } from "../queries/inventory";
import { locationsQuery } from "../queries/locations";
import { productVariantDeleteQuery, productVariantsBulkCreateQuery, productVariantsBulkUpdate, productVariantUpdateQuery } from "../queries/variants";
import xml_to_js from "xml-js";
import fs from "fs";
import { ProductInput, ProductInputs, Variant } from "../types/Product";
dotenv.config();
const { ACCESS_TOKEN, STORE, API_VERSION } = process.env;
const COLLECTION_VAT_12_DPH = "gid://shopify/Collection/390902710501";

/*-------------------------------------MAIN FUNCTION------------------------------------------------*/
// Fetch all products from XML file
// Load preferred products to be imported (CSV file)
// Log not found products into file
// Get products, check for variants
// Check if product already exists
// Create new products as DRAFT, with tag BrainMarket
// Add products with 12% tax to dedicated collection

// Activate product variants at all locations
// Update variants inventory policy to CONTINUE
// Update variants inventory quantity to 0

/*-------------------------------------MAIN FUNCTION------------------------------------------------*/

export const brainmarkets_products_import = async (req: Request, res: Response) => {
  try {
    const xmlUrl = req.query.xmlUrl as string;
    const preferredItemsFilePath = req.query.preferredItemsFilePath as string;
    const client = new GraphQLClient(`https://${STORE}/admin/api/${API_VERSION}/graphql.json`, {
      // @ts-ignore
      headers: {
        "X-Shopify-Access-Token": ACCESS_TOKEN,
      },
    });

    // fetch all products from XML file
    const items = await fetchProductsFromXml(xmlUrl);
    const mappedItems = mapItems(items);

    const preferredItems = preferredItemsFilePath ? readPreferredItemsFromCsv(preferredItemsFilePath) : null;
    console.log("loaded preferred products", preferredItems?.length);

    let itemsToImport = preferredItems ? mappedItems.filter((item: any) => preferredItems.includes(item.title)) : mappedItems;

    console.log("items to import", itemsToImport.length);

    // const missingItems = preferredItems.filter((item: any) => !itemsToImport.some((i: any) => i.title === item));
    // console.log("missing items", missingItems.length);

    const products = createProductObjects(itemsToImport);
    const variants = createVariantObjects(itemsToImport);

    const locations = await client.request(locationsQuery);
    const locationIds = locations.locations.edges.map((location: any) => location.node.id);

    for (const product of products) {
      const productExists = await client.request(productsQuery, {
        query: `title:${product.product.title}`,
      });
      if (productExists.products.edges.length > 0) {
        console.log("product already exists", product.product.title);
        continue;
      }
      const hasVariants = variants[product.product.title].length > 1;

      const productObject = {
        input: product.product,
        media: product.media,
      };
      const newProduct = await client.request(productCreateQuery, productObject);
      if (newProduct.productCreate.userErrors.length > 0) {
        console.error(newProduct.productCreate.userErrors);
        continue;
      }
      const newProductId = newProduct.productCreate.product.id;
      if (hasVariants) {
        const variantsToImport = variants[product.product.title];
        await createVariants(client, variantsToImport, newProductId, variantsToImport.length > 1, locationIds);
      } else {
        // Set track to true
        const matchingVariant = variants[product.product.title]?.[0];
        await trackVariantInventory(client, newProductId, matchingVariant, newProduct.productCreate.product.variants.edges[0].node.id);

        // Activate inventory item at all locations
        const inventoryItemId = newProduct.productCreate.product.variants.edges[0].node.inventoryItem.id;
        await activateInventory(client, inventoryItemId, locationIds);

        // Set inventory quantity to 0 at all locations
        const setInventoryQuantity = await client.request(inventorySetQuantities, {
          input: {
            ignoreCompareQuantity: true,
            name: "available",
            quantities: locationIds.map((locationId: any) => ({
              inventoryItemId: inventoryItemId,
              locationId,
              quantity: 0,
            })),
            reason: "other",
          },
        });
        if (setInventoryQuantity.inventorySetQuantities.userErrors.length > 0) {
          console.error(setInventoryQuantity.inventorySetQuantities.userErrors);
        }

        await new Promise((resolve) => setTimeout(resolve, 500));
        console.log("product created", product.product.title);
      }
    }

    return res.status(200).json({ variants });
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

const mapItems = (items: any) => {
  return items.map((item: any) => {
    return {
      title: item.PRODUCTNAME?._text,
      descriptionHtml: item.DESCRIPTION?._text,
      shortDescription: item.shortDescription?._text,
      price: item.PRICE_VAT?._text,
      vat: item.VAT?._text,
      sku: "NP" + item.ITEM_ID?._text,
      ean: item.EAN?._text,
      groupId: item.ITEMGROUP_ID?._text,
      optionName: item.PARAM?.PARAM_NAME?._text,
      optionValue: item.PARAM?.VAL?._text,
      mainImage: item.IMGURL?._text,
      images: Array.isArray(item.IMGURL_ALTERNATIVE) ? item.IMGURL_ALTERNATIVE.map((image: any) => image._text).filter((url: any) => url != null) : [],
      vendor: "BrainMarket",
    };
  });
};

const readPreferredItemsFromCsv = (preferredItemsFilePath: string) => {
  const preferredItems = fs.readFileSync(preferredItemsFilePath, "utf8");
  return preferredItems.split("\n").map((item: any) => item.trim());
};

const createProductObjects = (items: any) => {
  const products: ProductInputs[] = [];
  for (const item of items) {
    // if products has input with same title ignore
    if (products.some((product: any) => product.product.title === item.title)) {
      continue;
    }
    const allMedia = [item.mainImage, ...item.images];
    const input = {
      product: {
        title: item.title,
        descriptionHtml: item.descriptionHtml,
        collectionsToJoin: item.vat == "12" ? [COLLECTION_VAT_12_DPH] : [],
        vendor: item.vendor,
        tags: ["BrainMarket"],
        status: "DRAFT",
        seo: {
          title: item.title,
          description: item.shortDescription,
        },
      },
      media: allMedia.map((url: any) => ({
        mediaContentType: "IMAGE",
        originalSource: url,
      })),
    } as ProductInput;

    if (item.vat == "12") {
      input.product.tags.push("DPH 12%");
    }
    products.push(input);
  }
  return products;
};

const createVariantObjects = (items: any) => {
  const variants: Variant[] = [];
  for (const item of items) {
    const variant = {
      productTitle: item.title,
      barcode: item.ean,
      price: item.price,
      inventoryPolicy: "CONTINUE",
      inventoryItem: {
        tracked: true,
        measurement: {
          weight: {
            unit: "KILOGRAMS",
            value: 1,
          },
        },
        sku: item.sku,
      },
      optionValues: [],
    } as unknown as Variant;

    if (item.groupId) {
      variant.optionValues.push({
        optionName: item.optionName,
        name: item.optionValue,
      });
    }
    variants.push(variant);
  }

  const groupedVariants = variants.reduce((acc, variant) => {
    const title = variant.productTitle;
    if (!acc[title]) {
      acc[title] = [];
    }
    acc[title].push(variant);
    return acc;
  }, {} as Record<string, any[]>);

  return groupedVariants;
};

const createVariants = async (client: GraphQLClient, variants: Variant[], newProductId: string, withOptionValues: boolean, locationIds: string[]) => {
  const createdOption = withOptionValues
    ? await client.request(productOptionsCreateQuery, {
        options: {
          name: variants[0].optionValues[0].optionName,
          values: [
            {
              name: "Initial",
            },
          ],
        },
        productId: newProductId,
      })
    : null;

  const initialVariantId = withOptionValues ? createdOption.productOptionsCreate.product.variants.edges[0].node.id : null;

  for (const variant of variants) {
    const newVariant = await client.request(productVariantsBulkCreateQuery, {
      productId: newProductId,
      variants: [
        {
          barcode: variant.barcode,
          inventoryItem: variant.inventoryItem,
          price: variant.price,
          sku: variant.sku,
          inventoryPolicy: variant.inventoryPolicy,
          inventoryQuantities: locationIds.map((locationId: any) => ({
            locationId,
            availableQuantity: 0,
          })),
          optionValues:
            variant.optionValues.length > 0
              ? variant.optionValues.map((option: any) => ({
                  optionName: option.optionName,
                  name: option.name,
                }))
              : [
                  {
                    optionName: "Title",
                    name: "Default Title",
                  },
                ],
        },
      ],
    });
    if (newVariant.productVariantsBulkCreate.userErrors.length > 0) {
      console.error(newVariant.productVariantsBulkCreate.userErrors);
    }
  }

  // remove initial variant
  if (initialVariantId) {
    await client.request(productVariantDeleteQuery, {
      productId: newProductId,
      variantsIds: [initialVariantId],
    });
  }

  return "ok";
};

const trackVariantInventory = async (client: GraphQLClient, productId: string, variant: any, variantId: string) => {
  const enableTrackInventory = await client.request(productVariantUpdateQuery, {
    productId: productId,
    variants: [
      {
        id: variantId,
        barcode: variant.barcode,
        price: variant.price,
        inventoryPolicy: "CONTINUE",
        inventoryItem: {
          tracked: true,
          sku: variant.inventoryItem.sku,
          measurement: {
            weight: {
              unit: "KILOGRAMS",
              value: 1,
            },
          },
        },
      },
    ],
  });
  if (enableTrackInventory.productVariantsBulkUpdate.userErrors.length > 0) {
    console.error(enableTrackInventory.productVariantsBulkUpdate.userErrors);
  }
  return enableTrackInventory;
};

const activateInventory = async (client: GraphQLClient, inventoryItemId: string, locationIds: string[]) => {
  const bulkUpdateInventory = await client.request(inventoryBulkToggleActivation, {
    inventoryItemId: inventoryItemId,
    inventoryItemUpdates: locationIds.map((locationId: any) => ({
      activate: true,
      locationId,
    })),
  });
  if (bulkUpdateInventory.inventoryBulkToggleActivation.userErrors.length > 0) {
    console.error(bulkUpdateInventory.inventoryBulkToggleActivation.userErrors);
  }
  return bulkUpdateInventory;
};
