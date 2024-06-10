import "dotenv/config";
import { MailerSend, EmailParams, Sender, Recipient } from "mailersend";
const { MAILERSEND_API_TOKEN, SENDER_EMAIL, SENDER_NAME, REPLY_EMAIL } =
  process.env;

export const notifyMerchant = async (
  customerEmail: string,
  message: string
) => {
  const mailerSend = new MailerSend({
    apiKey: MAILERSEND_API_TOKEN as string,
  });
  const replyEmail = REPLY_EMAIL as string;

  const sentFrom = new Sender(SENDER_EMAIL as string, SENDER_NAME as string);

  const recipients = [new Recipient(customerEmail, "Zákazník")];

  const emailParams = new EmailParams()
    .setFrom(sentFrom)
    .setTo(recipients)
    .setInReplyTo(replyEmail)
    .setCc([new Recipient(replyEmail, "Yes Krabičky")])
    .setSubject(
      "Nová žádost o pozastavení Yes Krabičky - neodpovídejte na tento email."
    )
    .setHtml(message);

  await mailerSend.email.send(emailParams);
};
