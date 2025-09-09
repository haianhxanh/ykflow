import { Request, Response } from "express";
import dotenv from "dotenv";
import { GraphQLClient } from "graphql-request";
import { discountQuery } from "../queries/discounts";
import { productsQueryWithVariants } from "../queries/products";
import { collectionQuery } from "../queries/collections";
import { metafieldsDeleteMutation, metafieldsSetMutation } from "../queries/metafields";
import { variantByIdQuery } from "../queries/variants";
import AutomaticDiscounts from "../model/automaticDiscounts.model";
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
  const startTime = Date.now();
  console.log(`Starting request at ${new Date().toISOString()}`);

  try {
    console.log(req.body);
    // return res.status(200).json(req.body);
    const client = new GraphQLClient(`https://${STORE}/admin/api/${API_VERSION}/graphql.json`, {
      headers: {
        "X-Shopify-Access-Token": ACCESS_TOKEN as string,
      },
    });

    const discountGid = req.body.admin_graphql_api_id;

    const activeStatus = req.body?.status == "ACTIVE";

    if (!activeStatus) {
      // check in DB if discount is related to program discount
      const discountId = await AutomaticDiscounts.findOne({ where: { gid: discountGid.split("/").pop() as string } });
      if (discountId) {
        const status = req.body?.status || "DELETED";
        await deleteMetafieldsWithMatchingDiscount(discountGid, client, status);
        return res.status(200).json({ message: "Discount data removed from associated variant metafields" });
      }
      return res.status(200).json({ message: "Discount not related to program discount" });
    }

    if (!discountGid.includes("DiscountAutomaticNode")) {
      return res.status(200).json({ error: "Discount is not an automatic discount" });
    }

    // 1. Check related products and variants - only proceed if those are programs and includes allowed SKU prefixes ["5D", "10D", "15D", "20D", "60D"]
    // 2. Check if discount is active
    // Proceed with updating variant metafields

    let variants: any[] = [];
    const discount = (await client.request(discountQuery, { discountGid }))?.discountNode?.discount;
    if (!discount) {
      return res.status(200).json({ error: "Discount not found" });
    }
    const discountStatus = discount?.status;

    const discountedCollections = discount.customerGets.items.collections?.edges.map((edge: any) => edge.node.id);
    const discountedProducts = discount.customerGets.items.products?.edges;
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
      // return res.status(200).json(discountedProducts);
      const discountedProductsVariants = discountedProducts
        .map((product: any) => {
          return product?.node?.variants?.edges?.map((edge: any) => {
            if (ALLOWED_SKU_PREFIXES.some((prefix: string) => edge?.node?.sku?.startsWith(prefix))) {
              return edge.node.id;
            }
          });
        })
        .flat()
        .filter((variant: any) => variant !== undefined);
      // return res.status(200).json(discountedProductsVariants);
      for (const variantId of discountedProductsVariants) {
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

    if (discountStatus === "ACTIVE" || discountStatus === "SCHEDULED") {
      // if evaluated as active discount, first remove metafields
      await deleteMetafieldsWithMatchingDiscount(discountGid, client, discountStatus);
      await new Promise((resolve) => setTimeout(resolve, 500));

      const metafieldsToSet = [];
      for (const variant of variants) {
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
          if (metafieldsSetResponse?.metafieldsSet?.userErrors?.length > 0) {
            console.log("Error setting metafields", metafieldsToSet.slice(i, i + BATCH_SIZE));
          } else {
            console.log(
              "Metafields set",
              metafieldsToSet.slice(i, i + BATCH_SIZE).map((metafield: any) => metafield.ownerId)
            );
          }
        }
      }

      await AutomaticDiscounts.create({
        gid: discountGid.split("/").pop() as string,
      });
    } else {
      await deleteMetafieldsWithMatchingDiscount(discountGid, client, discountStatus);
    }

    console.log(`Request completed successfully in ${Date.now() - startTime}ms`);

    return res.status(200).json({
      message: "Discount updated successfully",
    });
  } catch (error) {
    console.log(`Request failed after ${Date.now() - startTime}ms:`, error);
    return res.status(500).json({ error: "Internal server error", errorDetails: error });
  }
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

const deleteMetafieldsWithMatchingDiscount = async (discountGid: string, client: GraphQLClient, discountStatus: string) => {
  const metafieldsToDelete = [];
  const programProducts = await client.request(productsQueryWithVariants, {
    query: "tags:Programy",
  });
  // return varaints with metafields length > 0
  const variantsWithMetafields: any[] = [];
  programProducts?.products?.edges?.forEach((edge: any) => {
    edge.node?.variants?.edges?.forEach((variant: any) => {
      if (variant?.node?.metafields?.edges?.length > 0) {
        variantsWithMetafields.push({
          id: variant.node.id,
          sku: variant.node.sku,
          metafields: variant.node.metafields,
        });
      }
    });
  });

  for (const variant of variantsWithMetafields) {
    if (variant.metafields?.edges?.find((metafield: any) => metafield.node.key === "data" && metafield.node.namespace == "campaign")) {
      const campaignData = JSON.parse(
        variant.metafields.edges.find((metafield: any) => metafield.node.key === "data" && metafield.node.namespace == "campaign")?.node?.value
      );
      const matchingCampaign = campaignData?.id == discountGid;
      if (matchingCampaign) {
        metafieldsToDelete.push({
          ownerId: variant.id,
          namespace: "campaign",
          key: "data",
        });
      }
    }
  }

  if (metafieldsToDelete.length > 0) {
    const deletedMetafields = await client.request(metafieldsDeleteMutation, {
      metafields: metafieldsToDelete,
    });
    if (deletedMetafields?.metafieldsDelete?.userErrors?.length == 0) {
      console.log(
        `Deleted metafields as discount is ${discountStatus}`,
        variantsWithMetafields?.map((variant: any) => variant.sku)
      );
    } else {
      console.log(
        `Error deleting metafields as discount is ${discountStatus}`,
        variantsWithMetafields?.map((variant: any) => variant.sku)
      );
    }
  }

  return metafieldsToDelete;
};
