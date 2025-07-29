import { Request, Response } from "express";
import dotenv from "dotenv";
import { sendNotification } from "../utils/notification";
dotenv.config();
const { ORDER_EXPORT_RECIPIENTS, MANDRILL_MESSAGE_BCC_ADDRESS_DEV } = process.env;
const recipientEmails = ORDER_EXPORT_RECIPIENTS as string;

/*-------------------------------------MAIN FUNCTION------------------------------------------------*/

export const custom_email_2 = async (req: Request, res: Response) => {
  try {
    const { recipient, orderNumber } = req.query;
    if (!recipient || !orderNumber) {
      return res.status(400).json({ error: "Missing required parameters" });
    }
    const subject = `Omluva za chybnou fakturu`;
    const content = `Dobrý den,
      <p>
        omlouváme se, při vystavení faktury k Vaší objednávce ${orderNumber} došlo k chybě - faktura obsahuje poplatek za výdejní místo, přestože Vám nebyl ve skutečnosti účtován.
      </p>
      <p>
        Objednávka je v pořádku zaplacená a zpracovává se. V nejbližších dnech Vám zašleme opravný daňový doklad. Není třeba podnikat žádné další kroky.
      </p>
      <p>
        Děkujeme za pochopení a omlouváme se za zmatky.
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
