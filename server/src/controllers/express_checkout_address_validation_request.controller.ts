import { Request, Response } from "express";
import dotenv from "dotenv";
import { promisify } from "util";
import { GraphQLClient } from "graphql-request";
import { orderQuery } from "../queries/orders";
import { sendNotification } from "../utils/notification";
const sleep = promisify(setTimeout);
dotenv.config();

const { ACCESS_TOKEN, STORE, API_VERSION, MANDRILL_MESSAGE_BCC_ADDRESS_DEV } =
  process.env;

// ========================= DESCRIPTION =========================
// Request customer to validate their address when order is paid with Express Checkout
// ===============================================================

export const express_checkout_address_validation_request = async (
  req: Request,
  res: Response
) => {
  try {
    // console.log(req.body);
    const client = new GraphQLClient(
      `https://${STORE}/admin/api/${API_VERSION}/graphql.json`,
      {
        // @ts-ignore
        headers: {
          "X-Shopify-Access-Token": ACCESS_TOKEN,
        },
      }
    );

    console.log("orderId: ", req.body.orderId);

    if (!req.body.orderId) {
      return res.status(200).json(`orderId is required`);
    }

    const order = await client.request(orderQuery, {
      id: req.body.orderId,
    });

    let email = order.order.email;
    const firstName = order.order.shippingAddress.firstName || "";
    const lastName = order.order.shippingAddress.lastName || "";
    const address1 = order.order.shippingAddress.address1 || "";
    const address2 = order.order.shippingAddress.address2 || "";
    const city = order.order.shippingAddress.city || "";
    const zip = order.order.shippingAddress.zip || "";
    const phone = order.order.shippingAddress.phone || "";
    let address = `<b>${firstName} ${lastName}</b> <br><b>${address1} ${address2}</b><br><b>${city} ${zip}</b><br><b>Tel: ${phone}</b>`;
    let subject = `Yes Krabičky ${order.order.name}: Prosíme o kontrolu doručovací adresy`;
    let content = ` <p>Dobrý den,</p>
      <p>Děkujeme za Vaši objednávku. Platba byla provedena pomocí zrychlené metody, která může obsahovat neaktuální doručovací údaje. Prosíme, zkontrolujte následující doručovací adresu a telefonní číslo:</p>
      <p>${address}</p>
      <p>Pokud je potřeba adresu upravit, odpovězte na tento e-mail nebo nás kontaktujte na <a href="mailto:info@yeskrabicky.cz">info@yeskrabicky.cz</a>.</p>`;

    let sendEmail = sendNotification(
      subject,
      email,
      content,
      MANDRILL_MESSAGE_BCC_ADDRESS_DEV as string,
      null
    );
    return res.status(200).json(`Email sent: ${sendEmail}`);
  } catch (error) {
    console.log("Error: ", error);
    return res.status(200).json(`Error...`);
  }
};