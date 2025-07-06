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
      <div style="font-family: Arial, sans-serif; color: #000000; background-color: #f7f7f7; padding: 20px; max-width: 600px; margin: auto;">
      <div style="background-color: #ffffff; padding: 20px; border-radius: 4px; line-height: 1.5;">
        <p style="margin-top: 0;">Dobrý den,</p>
        <p>Zvolili jste vyzvednutí Vašich krabiček na odběrném místě 
          <a href="https://maps.app.goo.gl/k2Z3ZyqAfHngWBN79" style="color: #333333; text-decoration: underline;">Cukrááárna - Mratín</a>. 
          <br>
          Vaše krabičky budou vždy připraveny k vyzvednutí v <strong>16:00</strong>.
        </p>
        <p>Budeme se na Vás těšit.</p>
        
        <hr style="border: none; border-top: 1px solid #d3d3d3; margin: 30px 0;">
        
        <p>Dear customer,</p>
        <p>You have chosen to pick up your meal boxes at the 
          <a href="https://maps.app.goo.gl/k2Z3ZyqAfHngWBN79" style="color: #333333; text-decoration: underline;">Cukrááárna - Mratín</a> pick-up point.
          <br>
          Your boxes will always be ready for pickup at <strong>16:00</strong>.
        </p>
        <p>We look forward to seeing you.</p>
      </div>
    </div>
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
