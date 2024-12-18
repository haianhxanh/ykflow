"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkout_pickup_availability_check = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const graphql_request_1 = require("graphql-request");
const orders_1 = require("../queries/orders");
const locations_1 = require("../queries/locations");
const metafields_1 = require("../queries/metafields");
dotenv_1.default.config();
const { ACCESS_TOKEN, STORE, API_VERSION } = process.env;
// STEPS
// 1. In admin, reate metafield at each location with key "daily_orders_capacity" and value of the capacity
// 2. Using GraphQL app, create shop metafields with key "pickup_locations_meta" to hold the capacity and occupancy of each location
// 3. Get all orders with delivery method pick-up and financial status paid
const checkout_pickup_availability_check = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const client = new graphql_request_1.GraphQLClient(`https://${STORE}/admin/api/${API_VERSION}/graphql.json`, {
            // @ts-ignore
            headers: {
                "X-Shopify-Access-Token": ACCESS_TOKEN,
            },
        });
        let pickupLocations = yield client.request(locations_1.locationsQuery);
        let pickupLocationsMeta = [];
        pickupLocations.locations.edges.forEach((location) => {
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
        let orders = yield (0, orders_1.allOrdersQuery)(`delivery_method:pick-up AND financial_status:paid AND created_at:>=${createdAtDate}`);
        if (!orders || (orders === null || orders === void 0 ? void 0 : orders.length) == 0) {
            return res.status(200).json({ orders: [] });
        }
        let futureOrders = getOrdersWithPrograms(getFutureOrders(orders));
        for (const [index, order] of futureOrders.entries()) {
            let matchingLocation = pickupLocationsMeta === null || pickupLocationsMeta === void 0 ? void 0 : pickupLocationsMeta.find((location) => {
                var _a, _b;
                return (location === null || location === void 0 ? void 0 : location.name) == ((_b = (_a = order === null || order === void 0 ? void 0 : order.node) === null || _a === void 0 ? void 0 : _a.shippingLine) === null || _b === void 0 ? void 0 : _b.title);
            });
            if (!matchingLocation || !((_b = (_a = order === null || order === void 0 ? void 0 : order.node) === null || _a === void 0 ? void 0 : _a.lineItems) === null || _b === void 0 ? void 0 : _b.edges))
                continue;
            // console.log("this is the matching location", matchingLocation);
            let startDate = order.node.customAttributes.find((attr) => {
                return attr.key == "Datum začátku Yes Krabiček";
            });
            let endDate = order.node.customAttributes.find((attr) => {
                return attr.key.includes("Konec_");
            });
            startDate = formatDate(startDate.value);
            endDate = formatDate(endDate.value);
            for (const [index, lineItem] of order.node.lineItems.edges.entries()) {
                if (!startDate || !endDate)
                    continue;
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
                    let matchingDate = matchingLocation.occupancy.find((dateObj) => {
                        return dateObj.date == date;
                    });
                    if (!matchingDate) {
                        matchingLocation.occupancy.push({
                            date: date,
                            orders: 1,
                            ordersData: [order.node.name],
                        });
                    }
                    else {
                        matchingDate.orders++;
                        matchingDate.ordersData.push(order.node.name);
                    }
                });
                pickupLocationsMeta = pickupLocationsMeta.map((location) => {
                    if (location.name == matchingLocation.name) {
                        return matchingLocation;
                    }
                    return location;
                });
            }
        }
        pickupLocationsMeta = pickupLocationsMeta.map((location) => {
            location.occupancy.sort((a, b) => {
                // @ts-ignore
                return new Date(a.date) - new Date(b.date);
            });
            return location;
        });
        let ykFlowMetafields = yield client.request(metafields_1.shopMetafieldQuery, {
            namespace: "ykflow",
            key: "pickup_locations_meta",
        });
        console.log(ykFlowMetafields);
        let updatedkFlowMetafield = yield client.request(metafields_1.metafieldsSetMutation, {
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
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ error });
    }
});
exports.checkout_pickup_availability_check = checkout_pickup_availability_check;
function formatDate(date) {
    const [day, month, year] = date.split("-");
    return `${year}-${month}-${day}`;
}
function isDateInRange(date, startDate, endDate) {
    const inputDate = new Date(date);
    const start = new Date(startDate);
    const end = new Date(endDate);
    return inputDate >= start && inputDate <= end;
}
function totalOverlappingOrders(date, orders) {
    let count = 0;
    orders.forEach((order) => {
        if (isDateInRange(date, order.startDate, order.endDate)) {
            count++;
        }
    });
    return count;
}
function calculatePastDate(days) {
    let date = new Date();
    date.setDate(date.getDate() - days);
    return date.toISOString().split("T")[0];
}
function getFutureOrders(orders) {
    let now = new Date();
    return orders.filter((order) => {
        var _a, _b, _c, _d;
        let startDateAttr = (_b = (_a = order === null || order === void 0 ? void 0 : order.node) === null || _a === void 0 ? void 0 : _a.customAttributes) === null || _b === void 0 ? void 0 : _b.find((attr) => {
            return attr.key == "Datum začátku Yes Krabiček";
        });
        if (!startDateAttr)
            return false;
        let endDateAttr = (_d = (_c = order === null || order === void 0 ? void 0 : order.node) === null || _c === void 0 ? void 0 : _c.customAttributes) === null || _d === void 0 ? void 0 : _d.find((attr) => {
            var _a;
            if ((_a = attr === null || attr === void 0 ? void 0 : attr.key) === null || _a === void 0 ? void 0 : _a.includes("Konec_")) {
                return formatDate(attr.value);
            }
            else {
                return false;
            }
        });
        if (!endDateAttr)
            return false;
        let endDate = formatDate(endDateAttr.value);
        return new Date(endDate) > new Date(now);
    });
}
function getOrdersWithPrograms(orders) {
    return orders.filter((order) => {
        var _a, _b, _c;
        let programsItems = (_c = (_b = (_a = order === null || order === void 0 ? void 0 : order.node) === null || _a === void 0 ? void 0 : _a.lineItems) === null || _b === void 0 ? void 0 : _b.edges) === null || _c === void 0 ? void 0 : _c.filter((line) => {
            return line.node.variant.product.tags.includes("Programy");
        });
        return programsItems.length > 0;
    });
}
function getFutureBusinessDate(date, daysToAdd) {
    let count = 0;
    while (count < daysToAdd) {
        date.setDate(date.getDate() + 1);
        if (date.getDay() !== 0 && date.getDay() !== 6) {
            count++;
        }
    }
    return date;
}
function isBusinessDay(date) {
    const day = date.getDay();
    // 0 = Sunday, 6 = Saturday
    return day !== 0 && day !== 6;
}
function getNextBusinessDay(date) {
    const nextDate = new Date(date);
    nextDate.setDate(date.getDate() + 1);
    while (!isBusinessDay(nextDate)) {
        nextDate.setDate(nextDate.getDate() + 1);
    }
    return nextDate;
}
function iterateBusinessDates(startDate, endDate, callback) {
    let currentDate = new Date(startDate);
    const end = new Date(endDate);
    while (currentDate <= end) {
        if (isBusinessDay(currentDate)) {
            callback(currentDate.toISOString().split("T")[0]);
        }
        currentDate = getNextBusinessDay(currentDate);
    }
}
