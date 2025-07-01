import { Request, Response } from "express";
import dotenv from "dotenv";
import { sendNotification } from "../utils/notification";
dotenv.config();
const { ORDER_EXPORT_RECIPIENTS, MANDRILL_MESSAGE_BCC_ADDRESS_DEV, MANDRILL_MESSAGE_FROM_EMAIL_2 } = process.env;
const recipientEmails = ORDER_EXPORT_RECIPIENTS as string;

/*-------------------------------------MAIN FUNCTION------------------------------------------------*/

export const notification_order_preparation_time = async (req: Request, res: Response) => {
  try {
    const { orderName, orderEmail } = req.body;
    const content = `
    <p>Dobrý den,</p>
    <p>Zvolili jste vyzvednutí Vašich krabiček na odběrném místě <a href="https://maps.app.goo.gl/k2Z3ZyqAfHngWBN79">Cukrááárna - Mratín</a>. Vaše krabičky budou vždy připraveny k vyzvednutí v 16:00.</p>
    <p>Budeme se na Vás těšit.</p>
    <br>
    <p>EN</p>
    <p>Dear customer ,</p>
    <p>You have chosen to pick up your meal boxes at the <a href="https://maps.app.goo.gl/k2Z3ZyqAfHngWBN79">Cukrááárna - Mratín</a> pick-up point. Your boxes will always be ready for pickup at 16:00.</p>
    <p>We look forward to seeing you.</p>
    `;

    const bbcEmail = MANDRILL_MESSAGE_BCC_ADDRESS_DEV as string | null;

    const subject = "Yes Krabičky - Informace o vyzvednutí objednávky " + orderName;
    const fromEmail = MANDRILL_MESSAGE_FROM_EMAIL_2 as string | null;
    const emailNotification = await sendNotification(subject, orderEmail, content, fromEmail, bbcEmail, null, true);
    return res.status(200).json({ message: emailNotification });
  } catch (error) {
    console.log(error);
    return res.status(500).json({ error: "Error" });
  }
};
