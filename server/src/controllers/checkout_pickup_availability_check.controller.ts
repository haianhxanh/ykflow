import express, { Request, Response } from "express";
import axios from "axios";
import dotenv from "dotenv";
import Inquiry from "../model/inquiry.model";
import { GraphQLClient } from "graphql-request";
import { allOrdersQuery, ordersQuery } from "../queries/orders";
import { locationsQuery } from "../queries/locations";
import {
  metafieldsSetMutation,
  shopMetafieldQuery,
} from "../queries/metafields";
dotenv.config();
const { ACCESS_TOKEN, STORE, API_VERSION } = process.env;

// STEPS
// 1. In admin, reate metafield at each location with key "daily_orders_capacity" and value of the capacity
// 2. Using GraphQL app, create shop metafields with key "pickup_locations_meta" to hold the capacity and occupancy of each location
// 3. Get all orders with delivery method pick-up and financial status paid

export const checkout_pickup_availability_check = async (
  req: Request,
  res: Response
) => {
  try {
    const client = new GraphQLClient(
      `https://${STORE}/admin/api/${API_VERSION}/graphql.json`,
      {
        // @ts-ignore
        headers: {
          "X-Shopify-Access-Token": ACCESS_TOKEN,
        },
      }
    );

    let pickupLocations = await client.request(locationsQuery);

    let pickupLocationsMeta = [] as any;

    pickupLocations.locations.edges.forEach((location: any) => {
      let meta = location.node.metafield;
      if (!meta) {
        return;
      }
      pickupLocationsMeta.push({
        name: location.node.name,
        capacity: meta.value,
        occupancy: [],
      });
    });

    let createdAtDate = calculatePastDate(60);
    let orders = await allOrdersQuery(
      `delivery_method:pick-up AND financial_status:paid AND created_at:>=${createdAtDate}`
    );

    if (!orders || orders?.length == 0) {
      return res.status(200).json({ orders: [] });
    }

    let futureOrders = getOrdersWithPrograms(getFutureOrders(orders));

    for (const [index, order] of futureOrders.entries()) {
      let matchingLocation = pickupLocationsMeta?.find((location: any) => {
        return location?.name == order?.node?.shippingLine?.title;
      });

      if (!matchingLocation || !order?.node?.lineItems?.edges) continue;
      // console.log("this is the matching location", matchingLocation);

      let startDate = order.node.customAttributes.find((attr: any) => {
        return attr.key == "Datum začátku Yes Krabiček";
      });
      let endDate = order.node.customAttributes.find((attr: any) => {
        return attr.key.includes("Konec_");
      });
      startDate = formatDate(startDate.value);
      endDate = formatDate(endDate.value);
      for (const [index, lineItem] of order.node.lineItems.edges.entries()) {
        if (!startDate || !endDate) continue;
        // while (startDate <= endDate) {
        //   let matchingDate = matchingLocation.occupancy.find((date: any) => {
        //     return date.date == startDate;
        //   });
        //   if (!matchingDate) {
        //     matchingLocation.occupancy.push({
        //       date: startDate,
        //       orders: 1,
        //       ordersData: [order.node.name],
        //     });
        //   } else {
        //     matchingDate.orders++;
        //     matchingDate.ordersData.push(order.node.name);
        //   }
        //   startDate = getFutureBusinessDate(new Date(startDate), 1)
        //     .toISOString()
        //     .split("T")[0];
        // }

        iterateBusinessDates(startDate, endDate, (date) => {
          let matchingDate = matchingLocation.occupancy.find((dateObj: any) => {
            return dateObj.date == date;
          });

          if (!matchingDate) {
            matchingLocation.occupancy.push({
              date: date,
              orders: 1,
              ordersData: [order.node.name],
            });
          } else {
            matchingDate.orders++;
            matchingDate.ordersData.push(order.node.name);
          }
        });

        pickupLocationsMeta = pickupLocationsMeta.map((location: any) => {
          if (location.name == matchingLocation.name) {
            return matchingLocation;
          }
          return location;
        });
      }
    }

    pickupLocationsMeta = pickupLocationsMeta.map((location: any) => {
      location.occupancy.sort((a: any, b: any) => {
        // @ts-ignore
        return new Date(a.date) - new Date(b.date);
      });
      return location;
    });

    let ykFlowMetafields = await client.request(shopMetafieldQuery, {
      namespace: "ykflow",
      key: "pickup_locations_meta",
    });

    console.log(ykFlowMetafields);

    let updatedkFlowMetafield = await client.request(metafieldsSetMutation, {
      metafields: [
        {
          key: "pickup_locations_meta",
          namespace: "ykflow",
          ownerId: ykFlowMetafields.shop.id,
          type: "json",
          value: JSON.stringify(pickupLocationsMeta),
        },
      ],
    });

    if (updatedkFlowMetafield.metafieldsSet.userErrors.length > 0) {
      console.log(updatedkFlowMetafield.metafieldsSet.userErrors);
    }

    return res.status(200).json("Pickup locations meta updated");
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error });
  }
};

function formatDate(date: any) {
  const [day, month, year] = date.split("-");
  return `${year}-${month}-${day}`;
}

function isDateInRange(
  date: string,
  startDate: string,
  endDate: string
): boolean {
  const inputDate = new Date(date);
  const start = new Date(startDate);
  const end = new Date(endDate);

  return inputDate >= start && inputDate <= end;
}

function totalOverlappingOrders(date: string, orders: any): number {
  let count = 0;
  orders.forEach((order: any) => {
    if (isDateInRange(date, order.startDate, order.endDate)) {
      count++;
    }
  });
  return count;
}

function calculatePastDate(days: number) {
  let date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split("T")[0];
}

function getFutureOrders(orders: any) {
  let now = new Date();
  return orders.filter((order: any) => {
    let startDateAttr = order?.node?.customAttributes?.find((attr: any) => {
      return attr.key == "Datum začátku Yes Krabiček";
    });
    if (!startDateAttr) return false;
    let endDateAttr = order?.node?.customAttributes?.find((attr: any) => {
      if (attr?.key?.includes("Konec_")) {
        return formatDate(attr.value);
      } else {
        return false;
      }
    });
    if (!endDateAttr) return false;
    let endDate = formatDate(endDateAttr.value);
    return new Date(endDate) > new Date(now);
  });
}

function getOrdersWithPrograms(orders: any) {
  return orders.filter((order: any) => {
    let programsItems = order?.node?.lineItems?.edges?.filter((line: any) => {
      return line.node.variant.product.tags.includes("Programy");
    });
    return programsItems.length > 0;
  });
}

function getFutureBusinessDate(date: Date, daysToAdd: number) {
  let count = 0;
  while (count < daysToAdd) {
    date.setDate(date.getDate() + 1);
    if (date.getDay() !== 0 && date.getDay() !== 6) {
      count++;
    }
  }
  return date;
}

function isBusinessDay(date: Date): boolean {
  const day = date.getDay();
  // 0 = Sunday, 6 = Saturday
  return day !== 0 && day !== 6;
}

function getNextBusinessDay(date: Date): Date {
  const nextDate = new Date(date);
  nextDate.setDate(date.getDate() + 1);
  while (!isBusinessDay(nextDate)) {
    nextDate.setDate(nextDate.getDate() + 1);
  }
  return nextDate;
}

function iterateBusinessDates(
  startDate: string,
  endDate: string,
  callback: (date: string) => void
) {
  let currentDate = new Date(startDate);
  const end = new Date(endDate);

  while (currentDate <= end) {
    if (isBusinessDay(currentDate)) {
      callback(currentDate.toISOString().split("T")[0]);
    }
    currentDate = getNextBusinessDay(currentDate);
  }
}
