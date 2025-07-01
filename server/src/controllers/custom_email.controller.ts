import { Request, Response } from "express";
import dotenv from "dotenv";
import { sendNotification } from "../utils/notification";
dotenv.config();
const { ORDER_EXPORT_RECIPIENTS, MANDRILL_MESSAGE_BCC_ADDRESS_DEV } = process.env;
const recipientEmails = ORDER_EXPORT_RECIPIENTS as string;

/*-------------------------------------MAIN FUNCTION------------------------------------------------*/

export const custom_email = async (req: Request, res: Response) => {
  try {
    const { recipient, revisedInvoiceNo, invoiceNo, invoiceUrl } = req.query;
    if (!recipient || !revisedInvoiceNo || !invoiceNo || !invoiceUrl) {
      return res.status(400).json({ error: "Missing required parameters" });
    }
    const subject = `Omluva za chybně zaslaný doklad`;
    const content = `Dobrý den,
      <p>
        omlouváme se, ale při zpracování Vaší objednávky došlo k technické chybě, kvůli které jsme Vám omylem zaslali opravný daňový doklad <strong>${revisedInvoiceNo}</strong>, který není platný.
      </p>
      <p>
        Původní faktura <a href="${invoiceUrl}">${invoiceNo}</a>, kterou jste obdrželi jako první, je v pořádku a nadále platí. Není potřeba podnikat žádné další kroky.
      </p>
      <p>
        Omlouváme se za případné zmatky a děkujeme za pochopení.
      </p>
      <footer>
        S přáním hezkého dne,<br>
        Yes Krabičky
      </footer>`;
    const attachment = null;
    const showSignature = false;
    const bbcEmail = "";
    // return res.status(200).json({ recipient, invoiceNo, subject, content, attachment, showSignature, bbcEmail });
    const sendEmail = await sendNotification(subject, recipient as string, content, null, bbcEmail, attachment, showSignature);
    return res.status(200).send(sendEmail);
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: "Error" });
  }
};
