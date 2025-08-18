import { Request, Response } from "express";
import dotenv from "dotenv";
import { GraphQLClient } from "graphql-request";
import { ordersQuery } from "../queries/orders";
import { getYesterday } from "../utils/helpers";
import axios from "axios";
import { metafieldsSetMutation } from "../queries/metafields";
import { addTagsMutation } from "../queries/commonObjects";

dotenv.config();
const DELIVERY_METHOD_PICK_UP = "PICK_UP";
const GOOGLE_ADDRESS_COMPONENT_DISTRICT_TYPE = "administrative_area_level_2";

const { ACCESS_TOKEN, STORE, API_VERSION, GOOGLE_GEOCODING_API_KEY } = process.env;

/*-------------------------------------MAIN FUNCTION------------------------------------------------*/

export const orders_district_export = async (req: Request, res: Response) => {
  try {
    const client = new GraphQLClient(`https://${STORE}/admin/api/${API_VERSION}/graphql.json`, {
      // @ts-ignore
      headers: {
        "X-Shopify-Access-Token": ACCESS_TOKEN,
      },
    });

    const yesterday = req.query.date ? req.query.date : getYesterday();

    const latestOrders = await client.request(ordersQuery, {
      query: `(created_at:'${yesterday}')`,
    });

    const disallowedFinancialStatuses = ["VOIDED", "EXPIRED", "REFUNDED"];

    const metafieldsToUpdate: any[] = [];

    for (const [orderIndex, order] of latestOrders.orders.edges.entries()) {
      if (disallowedFinancialStatuses.includes(order.node?.displayFinancialStatus)) {
        continue;
      }
      const firstFulfillmentOrder = order.node.fulfillmentOrders?.edges[0]?.node;
      if (!firstFulfillmentOrder) {
        continue;
      }
      const deliveryMethod = firstFulfillmentOrder.deliveryMethod?.methodType;
      let address = "";
      if (deliveryMethod === DELIVERY_METHOD_PICK_UP) {
        const fulfillmentAddress = firstFulfillmentOrder.assignedLocation?.location?.address;
        address = assembleAddress(fulfillmentAddress);
      } else {
        const shippingAddress = order.node.shippingAddress;
        address = assembleAddress(shippingAddress);
      }
      const addressDistrict = await getDistrictFromGoogleApi(address);
      if (!addressDistrict) {
        continue;
      }
      metafieldsToUpdate.push({
        ownerId: order.node.id,
        namespace: "custom",
        key: "district",
        type: "single_line_text_field",
        value: addressDistrict,
      });

      const addedTag = await client.request(addTagsMutation, {
        id: order.node.id,
        tags: [`OKRES: ${addressDistrict}`],
      });

      if (addedTag.tagsAdd.userErrors.length > 0) {
        console.log("addedTag errors" + addedTag.tagsAdd.userErrors);
      }

      await new Promise((resolve) => setTimeout(resolve, 200));
    }

    for (let i = 0; i < metafieldsToUpdate.length; i += 25) {
      const batch = metafieldsToUpdate.slice(i, i + 25);
      const updatedMetafields = await client.request(metafieldsSetMutation, {
        metafields: batch,
      });
      if (updatedMetafields.metafieldsSet.userErrors.length > 0) {
        console.log("updatedMetafields errors" + updatedMetafields.metafieldsSet.userErrors);
      }
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return res.status(200).json("ok");
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Error exporting orders" });
  }
};

const assembleAddress = (addressObject: any) => {
  const addressParts = [addressObject?.address1, addressObject?.address2, addressObject?.city, addressObject?.zip, addressObject?.country].filter(Boolean);
  return addressParts.join(", ");
};

const getDistrictFromGoogleApi = async (address: string) => {
  const encodedAddress = encodeURIComponent(address);
  try {
    const addressDistrict = await axios
      .get(`https://maps.googleapis.com/maps/api/geocode/json?address=${encodedAddress}&key=${GOOGLE_GEOCODING_API_KEY}`)
      .then((res) => res.data)
      .then((json) => {
        if (json.results.length === 0) {
          return null;
        }
        const district = json.results[0].address_components.find((component: any) => component.types.includes(GOOGLE_ADDRESS_COMPONENT_DISTRICT_TYPE));
        return district?.long_name;
      });
    return addressDistrict;
  } catch (error) {
    console.log("Error getting district from google api" + error);
    return null;
  }
};
