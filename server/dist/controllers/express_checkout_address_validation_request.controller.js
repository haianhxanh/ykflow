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
exports.express_checkout_address_validation_request = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const util_1 = require("util");
const graphql_request_1 = require("graphql-request");
const orders_1 = require("../queries/orders");
const notification_1 = require("../utils/notification");
const sleep = (0, util_1.promisify)(setTimeout);
dotenv_1.default.config();
const { ACCESS_TOKEN, STORE, API_VERSION, MANDRILL_MESSAGE_BCC_ADDRESS_DEV } = process.env;
// ========================= DESCRIPTION =========================
// Request customer to validate their address when order is paid with Express Checkout
// ===============================================================
const express_checkout_address_validation_request = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    try {
        // console.log(req.body);
        const client = new graphql_request_1.GraphQLClient(`https://${STORE}/admin/api/${API_VERSION}/graphql.json`, {
            // @ts-ignore
            headers: {
                "X-Shopify-Access-Token": ACCESS_TOKEN,
            },
        });
        console.log("orderId: ", req.body.orderId);
        if (!req.body.orderId) {
            return res.status(200).json(`orderId is required`);
        }
        const order = yield client.request(orders_1.orderQuery, {
            id: req.body.orderId,
        });
        let email = order.order.email;
        let content, subject;
        if (!((_a = order === null || order === void 0 ? void 0 : order.order) === null || _a === void 0 ? void 0 : _a.shippingAddress)) {
            if (!((_c = (_b = order === null || order === void 0 ? void 0 : order.order) === null || _b === void 0 ? void 0 : _b.billingAddress) === null || _c === void 0 ? void 0 : _c.phone)) {
                subject = `Yes Krabičky ${order.order.name}: Prosíme o doplnění telefonního čísla`;
                content = `<p>Dobrý den,</p>
          <p>děkujeme za Vaši objednávku. Rádi bychom Vás požádali o poskytnutí telefonního čísla, abychom Vás pro doručení Vašich krabiček mohli snadno kontaktovat.</p>
          <p>Telefonní číslo nám prosím zašlete jako odpověď na tento e-mail nebo na <a href="mailto:info@yeskrabicky.cz">info@yeskrabicky.cz</a>.</p>
          <p>Děkujeme.</p>`;
                let sendEmailToPickupOrder = yield (0, notification_1.sendNotification)(subject, email, content, MANDRILL_MESSAGE_BCC_ADDRESS_DEV, null, true);
                return res.status(200).json({
                    emailSent: sendEmailToPickupOrder,
                    message: `Is pickup order ${order.order.name}`,
                });
            }
            return res.status(200).json(`Is pickup order ${order.order.name}`);
        }
        const firstName = order.order.shippingAddress.firstName || "";
        const lastName = order.order.shippingAddress.lastName || "";
        const address1 = order.order.shippingAddress.address1 || "";
        const address2 = order.order.shippingAddress.address2 || "";
        const city = order.order.shippingAddress.city || "";
        const zip = order.order.shippingAddress.zip || "";
        const phone = order.order.shippingAddress.phone || "";
        let address = `<b>${firstName} ${lastName}</b> <br><b>${address1} ${address2}</b><br><b>${city} ${zip}</b><br><b>Tel: ${phone}</b>`;
        subject = `Yes Krabičky ${order.order.name}: Prosíme o kontrolu doručovací adresy`;
        content = ` <p>Dobrý den,</p>
      <p>Děkujeme za Vaši objednávku. Platba byla provedena pomocí zrychlené metody, která může obsahovat neaktuální doručovací údaje. Prosíme, zkontrolujte následující doručovací adresu a telefonní číslo:</p>
      <p>${address}</p>
      <p>Pokud je potřeba adresu upravit, odpovězte na tento e-mail nebo nás kontaktujte na <a href="mailto:info@yeskrabicky.cz">info@yeskrabicky.cz</a>.</p>`;
        let sendEmail = yield (0, notification_1.sendNotification)(subject, email, content, MANDRILL_MESSAGE_BCC_ADDRESS_DEV, null, true);
        return res.status(200).json(`Email sent: ${sendEmail}`);
    }
    catch (error) {
        console.log("Error: ", error);
        return res.status(200).json(`Error...`);
    }
});
exports.express_checkout_address_validation_request = express_checkout_address_validation_request;
