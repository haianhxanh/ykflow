import { Request, Response } from "express";
import dotenv from "dotenv";
import { GraphQLClient } from "graphql-request";
import { discountQuery } from "../queries/discounts";
import { productsQuery } from "../queries/products";
import { collectionQuery } from "../queries/collections";
import { metafieldsDeleteMutation, metafieldsSetMutation } from "../queries/metafields";
import { variantByIdQuery } from "../queries/variants";
dotenv.config();
const { ACCESS_TOKEN, STORE, API_VERSION } = process.env;

const ALLOWED_SKU_PREFIXES = ["5D", "10D", "15D", "20D", "40D", "60D"];

const BATCH_SIZE = 25; // max 25 metafields per request

type DiscountData = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  status: string;
  customerGets: {
    value: {
      percentage: number | null;
      amount: {
        amount: string; // decimal string
      } | null;
    };
    items: {
      collections: {
        edges: {
          node: {
            id: string;
          };
        }[];
      } | null;
      products: {
        edges: {
          node: {
            id: string;
          };
        }[];
      } | null;
    };
  };
};

/*-------------------------------------MAIN FUNCTION------------------------------------------------*/

export const programs_campaign_pricing_update = async (req: Request, res: Response) => {
  try {
    console.log(req.body);
    // return res.status(200).json(req.body);
    const client = new GraphQLClient(`https://${STORE}/admin/api/${API_VERSION}/graphql.json`, {
      headers: {
        "X-Shopify-Access-Token": ACCESS_TOKEN as string,
      },
    });

    const discountGid = req.body.admin_graphql_api_id;

    if (!discountGid.includes("DiscountAutomaticNode")) {
      return res.status(200).json({ error: "Discount is not an automatic discount" });
    }

    // 1. Check related products and variants - only proceed if those are programs and includes allowed SKU prefixes ["5D", "10D", "15D", "20D", "60D"]
    // 2. Check if discount is active
    // Proceed with updating variant metafields

    // 3. Check if discount is inactive
    // Proceed with removing variant metafields

    let variants = [];
    let metafieldsToUpdate = [];
    const discount = (await client.request(discountQuery, { discountGid }))?.discountNode?.discount;
    if (!discount) {
      return res.status(200).json({ error: "Discount not found" });
    }
    const discountStatus = discount?.status;
    // return res.status(200).json(discount);
    const discountType = discount?.customerGets?.value?.percentage ? "PERCENTAGE" : "FIXED";

    const discountedCollections = discount.customerGets.items.collections?.edges.map((edge: any) => edge.node.id);
    const discountedProducts = discount.customerGets.items.products?.edges.map((edge: any) => edge.node.id);
    const discountedVariants = discount.customerGets.items.productVariants?.edges.map((edge: any) => edge.node.id);

    if (discountedCollections) {
      for (const collectionId of discountedCollections) {
        const collection = await client.request(collectionQuery, { collectionGid: collectionId });
        const programs = collection?.collection?.products?.edges?.filter((edge: any) => edge.node?.tags?.includes("Programy"));
        if (programs.length > 0) {
          for (const program of programs) {
            const programVariants = program?.node?.variants?.edges?.map((edge: any) => {
              if (ALLOWED_SKU_PREFIXES.some((prefix: string) => edge?.node?.sku?.startsWith(prefix))) {
                return {
                  id: edge.node.id,
                  sku: edge.node.sku,
                  metafields: edge.node.metafields,
                };
              }
            });
            variants = variants.concat(programVariants.filter((variant: any) => variant !== undefined));
          }
        }
      }
    }

    if (discountedProducts) {
      // for (const productId of discountedProducts) {
      //   const product = await client.request(productQuery, { productGid: productId });
      //   const variants = product?.product?.variants?.edges?.map((edge: any) => edge.node.id);
      //   variants = variants.concat(productVariants.filter((variant: any) => variant !== undefined));
      // }
    }

    if (discountedVariants) {
      for (const variantId of discountedVariants) {
        const variant = await client.request(variantByIdQuery, { variantGid: variantId });
        if (
          variant?.productVariant?.product?.tags?.includes("Programy") &&
          ALLOWED_SKU_PREFIXES.some((prefix: string) => variant?.productVariant?.sku?.startsWith(prefix))
        ) {
          variants.push({
            id: variant.productVariant.id,
            sku: variant.productVariant.sku,
            metafields: variant.productVariant.metafields,
          });
        }
      }
    }

    if (discountStatus === "ACTIVE") {
      // if evaluated as active discount, first remove metafields
      // const variantsWithMetafields = variants.filter((variant: any) => variant?.metafields?.edges?.length > 0);
      // const metafieldsToDelete = variantsWithMetafields.flatMap((variant: any) =>
      //   variant.metafields?.edges?.map((metafield: any) => ({
      //     ownerId: variant.id,
      //     namespace: "campaign",
      //     key: metafield.node.key,
      //   }))
      // );
      // if (metafieldsToDelete.length > 0) {
      //   const deletedMetafields = await client.request(metafieldsDeleteMutation, {
      //     metafields: metafieldsToDelete,
      //   });
      // }
      // const metafieldsToSet = [];
      // for (const variant of variants) {
      //   const metafield = createMetafieldsData(variant.id, variant.price, discountGid);
      // }

      const metafieldsToSet = [];
      for (const variant of variants) {
        // get metafield campaign.data and update it
        // const existingCampaignDataMeta = variant.metafields.edges.find((metafield: any) => metafield.node.key === "data");
        // const isSameDiscount = existingCampaignDataMeta ? JSON.parse(existingCampaignDataMeta?.node?.value)?.id == discountGid : false;

        // if (existingCampaignDataMeta && !isSameDiscount) {
        //   // if existing but not the same, then evaluate the discount and update the meta
        //   console.log("this is running");
        //   return res.status(200).json(existingCampaignDataMeta);

        //   // TODO: check existing data and update it with new metaobject or remove current object and update current data
        // } else {
        //   // if not existing, or existing but the same, then just update the metafield right away
        //   metafieldsToSet.push({
        //     ownerId: variant.id,
        //     namespace: "campaign",
        //     key: "data",
        //     value: JSON.stringify(createDiscountObject(discount, discountGid)),
        //   });
        // }

        metafieldsToSet.push({
          ownerId: variant.id,
          namespace: "campaign",
          key: "data",
          value: JSON.stringify(createDiscountObject(discount, discountGid)),
        });
      }

      if (metafieldsToSet.length > 0) {
        for (let i = 0; i < metafieldsToSet.length; i += BATCH_SIZE) {
          const metafieldsSetResponse = await client.request(metafieldsSetMutation, {
            metafields: metafieldsToSet.slice(i, i + BATCH_SIZE),
          });
          console.log(metafieldsSetResponse);
        }
        return res.status(200).json(metafieldsToSet);
      }
    } else {
      // remove metafields from variants
      console.log("DISABLED");
    }

    return res.status(200).json(variants);

    const products = await client.request(productsQuery, { collectionGids: discountedCollections });

    return res.status(200).json(discountedCollections);
    return res.status(200).json(discount);
  } catch (error) {
    console.log(error);
  }
};

const priceCalculation = (price: number, discountType: string, discountValue: number) => {
  if (discountType === "PERCENTAGE") {
    return price * (1 - discountValue / 100);
  }
  return price - discountValue;
};

const createMetafieldsData = (variantId: string, price: number, discountData: DiscountData) => {
  const metafields = [];
  metafields.push({
    ownerId: variantId,
    namespace: "campaign",
    key: "id",
    value: discountData.id,
  });

  if (discountData.startsAt) {
    metafields.push({
      ownerId: variantId,
      namespace: "campaign",
      key: "starts_at",
      value: discountData.startsAt,
    });
  }

  if (discountData.endsAt) {
    metafields.push({
      ownerId: variantId,
      namespace: "campaign",
      key: "ends_at",
      value: discountData.endsAt,
    });
  }

  if (discountData.customerGets.value.percentage) {
    metafields.push({
      ownerId: variantId,
      namespace: "campaign",
      key: "discount_percentage",
      value: discountData.customerGets.value.percentage.toString(),
    });
  }

  return metafields;

  // TODO: add for amount
};

const createDiscountObject = (discountData: DiscountData, discountId: string) => {
  return {
    id: discountId,
    status: discountData.status,
    starts_at: discountData.startsAt,
    ends_at: discountData.endsAt,
    discount_percentage: discountData.customerGets?.value?.percentage || null,
    discount_amount: discountData.customerGets?.value?.amount?.amount || null,
    discount_type: discountData.customerGets?.value?.percentage ? "PERCENTAGE" : "FIXED",
  };
};
