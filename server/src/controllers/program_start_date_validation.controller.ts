import { Request, Response } from "express";
import dotenv from "dotenv";
import { convertDateToISOString, getFutureBusinessDate } from "../utils/helpers";
import { sendNotification } from "../utils/notification";
import { GraphQLClient } from "graphql-request";
import { orderQuery, orderUpdateMutation } from "../queries/orders";
import { metafieldsSetMutation } from "../queries/metafields";

dotenv.config();
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

export const program_start_date_validation = async (req: Request, res: Response) => {
  try {
    const orderId = req.body.orderId;
    const client = new GraphQLClient(`https://${STORE}/admin/api/${API_VERSION}/graphql.json`, {
      headers: {
        "X-Shopify-Access-Token": ACCESS_TOKEN as string,
      },
    });

    const order = (await client.request(orderQuery, { id: orderId }))?.order;

    if (!order) {
      return res.status(200).json({ error: "Order not found" });
    }

    const startDateAttr = order.customAttributes.find((attr: any) => attr.key === "Datum začátku Yes Krabiček");
    const normalizedStartDate = convertDateToISOString(startDateAttr?.value) || false;

    if (!normalizedStartDate) {
      return res.status(200).json({ error: "Start date not found" });
    }

    const createdAt = order.createdAt;
    // const customerEmail = order.customer?.email;
    const customerEmail = "hana.nguyen@plavecmedia.cz";
    const closestStartDate = getClosestStartDate(createdAt);
    const formattedClosestStartDate = convertDateToISOString(closestStartDate);

    const startDateValid = new Date(normalizedStartDate) >= new Date(closestStartDate);

    if (startDateValid) {
      return res.status(200).json({
        startDateValid,
      });
    }

    const attributes = order.customAttributes;
    const newAttributes = attributes.map((attr: any) => {
      if (attr.key === "Datum začátku Yes Krabiček") {
        return {
          key: "Datum začátku Yes Krabiček",
          value: formattedClosestStartDate,
        };
      }
      if (attr.key === "Den začátku Yes Krabiček") {
        return {
          key: "Den začátku Yes Krabiček",
          value: DAYS_IN_CZECH_REPUBLIC[new Date(closestStartDate).getDay() as keyof typeof DAYS_IN_CZECH_REPUBLIC],
        };
      }
      if (attr.key.includes("Konec_")) {
        // get new end date
        const variantId = attr.key.split("_")[1];
        const line = order.lineItems.edges.find((item: any) => item.node.variant.id === `gid://shopify/ProductVariant/${variantId}`);
        const lineSku = line.node.sku;
        const programLength = parseInt(lineSku.split("D")[0]) - 1;
        const newEndDate = getFutureBusinessDate(closestStartDate, programLength);
        return {
          key: attr.key,
          value: convertDateToISOString(newEndDate),
        };
      }
      return attr;
    });

    const updateOrderAttributes = await client.request(orderUpdateMutation, {
      input: {
        id: orderId,
        customAttributes: newAttributes,
      },
    });

    if (updateOrderAttributes.orderUpdate.userErrors.length > 0) {
      return res.status(400).json({ error: updateOrderAttributes.orderUpdate.userErrors[0].message });
    } else {
      // update order metafield original_dates and send email to customer
      const metafieldInput = {
        ownerId: orderId,
        key: "original_dates",
        namespace: "custom",
        value: JSON.stringify(attributes),
        type: "json",
      };
      const metafield = await client.request(metafieldsSetMutation, {
        metafields: [metafieldInput],
      });

      if (metafield.metafieldsSet.metafields.length > 0) {
        await sendProgramDateUpdatedEmail(customerEmail, order, startDateAttr?.value, formattedClosestStartDate);
      }
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const getClosestStartDate = (createdAt: string) => {
  const startDay = new Date(createdAt).getDay();
  const daysToAdd = CUT_OFF_TIMES[startDay as keyof typeof CUT_OFF_TIMES] - 1;
  const closestStartDate = getFutureBusinessDate(createdAt, daysToAdd);
  return closestStartDate;
};

const sendProgramDateUpdatedEmail = async (customerEmail: string, order: any, oldStartDate: string, newStartDate: string) => {
  const subject = `Aktualizace termínu začátku Vašeho programu - obj. ${order.name}`;
  const content = `Dobrý den, 
  <p>děkujeme za Vaši objednávku. Rádi bychom Vás informovali, že z logistických důvodů došlo k úpravě data začátku Vašeho programu.</p>
  <p>Původně zvolený termín ${oldStartDate} již nebylo možné dodržet, a proto byl automaticky posunut na nejbližší možný den: ${newStartDate}.</p>
  <p>Pokud Vám nový termín nevyhovuje, nebo máte jakékoli dotazy, neváhejte nás kontaktovat. Jsme Vám plně k dispozici.</p>
  <p>S přáním pěkného dne,</p>`;
  const emailSent = await sendNotification(
    subject,
    customerEmail,
    content,
    MANDRILL_MESSAGE_FROM_EMAIL as string,
    MANDRILL_MESSAGE_BCC_ADDRESS_DEV as string,
    null,
    true
  );
  return emailSent;
};
