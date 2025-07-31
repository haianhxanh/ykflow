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
exports.program_start_date_validation = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const helpers_1 = require("../utils/helpers");
const notification_1 = require("../utils/notification");
const graphql_request_1 = require("graphql-request");
const orders_1 = require("../queries/orders");
const metafields_1 = require("../queries/metafields");
dotenv_1.default.config();
const { ACCESS_TOKEN, STORE, API_VERSION, MANDRILL_MESSAGE_FROM_EMAIL, MANDRILL_MESSAGE_BCC_ADDRESS_DEV } = process.env;
/*-------------------------------------DESCRIPTION-----------------------------------------*/
// Validate program start date against cut-off times rule. If the start date is not valid, recalculate it and inform customer via email.
/*-------------------------------------RECEIVE INQUIRY-----------------------------------------*/
const CUT_OFF_TIMES = {
    1: 3, // Monday
    2: 5, // Tuesday
    3: 4, // Wednesday
    4: 4, // Thursday
    5: 4, // Friday
    6: 4, // Saturday
    0: 3, // Sunday
};
const DAYS_IN_CZECH_REPUBLIC = {
    1: "Pondělí",
    2: "Úterý",
    3: "Středa",
    4: "Čtvrtek",
    5: "Pátek",
    6: "Sobota",
    0: "Neděle",
};
const program_start_date_validation = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    try {
        const orderId = req.body.orderId;
        const client = new graphql_request_1.GraphQLClient(`https://${STORE}/admin/api/${API_VERSION}/graphql.json`, {
            headers: {
                "X-Shopify-Access-Token": ACCESS_TOKEN,
            },
        });
        const order = (_a = (yield client.request(orders_1.orderQuery, { id: orderId }))) === null || _a === void 0 ? void 0 : _a.order;
        if (!order) {
            return res.status(200).json({ error: "Order not found" });
        }
        const startDateAttr = order.customAttributes.find((attr) => attr.key === "Datum začátku Yes Krabiček");
        const normalizedStartDate = (0, helpers_1.convertDateToISOString)(startDateAttr === null || startDateAttr === void 0 ? void 0 : startDateAttr.value) || false;
        if (!normalizedStartDate) {
            return res.status(200).json({ error: "Start date not found" });
        }
        const createdAt = order.createdAt;
        const customerEmail = (_b = order.customer) === null || _b === void 0 ? void 0 : _b.email;
        const closestStartDate = getClosestStartDate(createdAt);
        const formattedClosestStartDate = (0, helpers_1.convertDateToISOString)(closestStartDate);
        const startDateValid = new Date(normalizedStartDate) >= new Date(closestStartDate);
        if (startDateValid) {
            return res.status(200).json({
                startDateValid,
            });
        }
        const attributes = order.customAttributes;
        const newAttributes = attributes.map((attr) => {
            if (attr.key === "Datum začátku Yes Krabiček") {
                return {
                    key: "Datum začátku Yes Krabiček",
                    value: formattedClosestStartDate,
                };
            }
            if (attr.key === "Den začátku Yes Krabiček") {
                return {
                    key: "Den začátku Yes Krabiček",
                    value: DAYS_IN_CZECH_REPUBLIC[new Date(closestStartDate).getDay()],
                };
            }
            if (attr.key.includes("Konec_")) {
                // get new end date
                const variantId = attr.key.split("_")[1];
                const line = order.lineItems.edges.find((item) => item.node.variant.id === `gid://shopify/ProductVariant/${variantId}`);
                const lineSku = line.node.sku;
                const programLength = parseInt(lineSku.split("D")[0]) - 1;
                const newEndDate = (0, helpers_1.getFutureBusinessDate)(closestStartDate, programLength);
                return {
                    key: attr.key,
                    value: (0, helpers_1.convertDateToISOString)(newEndDate),
                };
            }
            return attr;
        });
        const updateOrderAttributes = yield client.request(orders_1.orderUpdateMutation, {
            input: {
                id: orderId,
                customAttributes: newAttributes,
            },
        });
        if (updateOrderAttributes.orderUpdate.userErrors.length > 0) {
            return res.status(400).json({ error: updateOrderAttributes.orderUpdate.userErrors[0].message });
        }
        else {
            // update order metafield original_dates and send email to customer
            const metafieldInput = {
                ownerId: orderId,
                key: "original_dates",
                namespace: "custom",
                value: JSON.stringify(attributes),
                type: "json",
            };
            const metafield = yield client.request(metafields_1.metafieldsSetMutation, {
                metafields: [metafieldInput],
            });
            if (metafield.metafieldsSet.metafields.length > 0) {
                yield sendProgramDateUpdatedEmail(customerEmail, order, startDateAttr === null || startDateAttr === void 0 ? void 0 : startDateAttr.value, formattedClosestStartDate);
            }
        }
        return res.status(200).json({ success: true });
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Internal server error" });
    }
});
exports.program_start_date_validation = program_start_date_validation;
const getClosestStartDate = (createdAt) => {
    const startDay = new Date(createdAt).getDay();
    const daysToAdd = CUT_OFF_TIMES[startDay] - 1;
    const closestStartDate = (0, helpers_1.getFutureBusinessDate)(createdAt, daysToAdd);
    return closestStartDate;
};
const sendProgramDateUpdatedEmail = (customerEmail, order, oldStartDate, newStartDate) => __awaiter(void 0, void 0, void 0, function* () {
    const subject = `Aktualizace termínu začátku Vašeho programu - obj. ${order.name}`;
    const content = `Dobrý den, 
  <p>děkujeme za Vaši objednávku. Rádi bychom Vás informovali, že z logistických důvodů došlo k úpravě data začátku Vašeho programu.</p>
  <p>Původně zvolený termín ${oldStartDate} již nebylo možné dodržet, a proto byl automaticky posunut na nejbližší možný den: ${newStartDate}.</p>
  <p>Pokud Vám nový termín nevyhovuje, nebo máte jakékoli dotazy, neváhejte nás kontaktovat. Jsme Vám plně k dispozici.</p>
  <p>S přáním pěkného dne,</p>`;
    const emailSent = yield (0, notification_1.sendNotification)(subject, customerEmail, content, MANDRILL_MESSAGE_FROM_EMAIL, MANDRILL_MESSAGE_BCC_ADDRESS_DEV, null, true);
    return emailSent;
});
