import "dotenv/config";
const {
  MANDRILL_API_KEY,
  MANDRILL_MESSAGE_FROM_EMAIL,
  MANDRILL_MESSAGE_FROM_NAME,
  MANDRILL_MESSAGE_BCC_ADDRESS,
} = process.env;

type Message = {
  text: string;
  html: string;
  from_email: string;
  from_name: string;
  bcc_address: string;
  to: { email: string; type: string }[];
  subject: string;
};

const mailchimp = require("@mailchimp/mailchimp_transactional")(
  MANDRILL_API_KEY
);

export const sendNotification = async (
  subject: string,
  customerEmail: string,
  content: string
) => {
  // axios post request to send email
  const message: Message = {
    text: content,
    html: content + "<br><br>---<br>Yes Krabičky",
    from_email: MANDRILL_MESSAGE_FROM_EMAIL as string,
    from_name: MANDRILL_MESSAGE_FROM_NAME as string,
    to: [
      {
        email: customerEmail,
        type: "to",
      },
    ],
    subject: subject,
    bcc_address: MANDRILL_MESSAGE_BCC_ADDRESS as string,
  };

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
