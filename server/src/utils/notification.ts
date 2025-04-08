import "dotenv/config";
const { MANDRILL_API_KEY, MANDRILL_MESSAGE_FROM_EMAIL, MANDRILL_MESSAGE_FROM_NAME, MANDRILL_MESSAGE_BCC_ADDRESS } = process.env;

type Message = {
  text: string;
  html: string;
  from_email: string;
  from_name: string;
  bcc_address: string | null | undefined;
  to: { email: string; type: string }[];
  subject: string;
  attachments: {}[];
};

const mailchimp = require("@mailchimp/mailchimp_transactional")(MANDRILL_API_KEY);

export const sendNotification = async (
  subject: string,
  customerEmail: string,
  content: string,
  bbcEmail: string | null,
  attachment: any,
  showSignature: boolean
) => {
  // axios post request to send email
  let recipients = customerEmail.split(",").map((email) => {
    return { email: email.trim(), type: "to" };
  });
  let message: Message = {
    text: content,
    html: showSignature ? content + "<br><br>---<br>Yes Krabičky" : content,
    from_email: MANDRILL_MESSAGE_FROM_EMAIL as string,
    from_name: MANDRILL_MESSAGE_FROM_NAME as string,
    to: recipients,
    subject: subject,
    attachments: [],
    bcc_address: undefined,
  };

  if (attachment) {
    message.attachments = [
      {
        type: attachment.type,
        name: attachment.name,
        content: attachment.content,
      },
    ];
  }

  if (bbcEmail) {
    message.bcc_address = bbcEmail;
  }

  try {
    const response = sendEmail(message);
    return response;
  } catch (error) {
    console.log(error);
  }
};

async function sendEmail(message: Message) {
  const response = await mailchimp.messages.send({
    message,
  });
  return response;
}
