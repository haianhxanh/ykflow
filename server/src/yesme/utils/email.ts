import dotenv from "dotenv";

dotenv.config();

// Same Mandrill account as Yes Krabičky (MANDRILL_API_KEY), but Yes Mě's own sender and BCC.
const { MANDRILL_API_KEY, YESME_MANDRILL_FROM_EMAIL, YESME_MANDRILL_FROM_NAME, YESME_MANDRILL_BCC_ADDRESS } = process.env;

type Attachment = { type: string; name: string; content: string };

let client: any = null;
const mandrill = () => {
  if (!MANDRILL_API_KEY || !YESME_MANDRILL_FROM_EMAIL) {
    throw new Error("MANDRILL_API_KEY or YESME_MANDRILL_FROM_EMAIL is not configured");
  }
  client = client || require("@mailchimp/mailchimp_transactional")(MANDRILL_API_KEY);
  return client;
};

// Throws when Mandrill rejects the request or any recipient, so callers never report a failed send as emailed.
// (The Mandrill client returns errors instead of throwing them.)
export const sendYesmeEmail = async (subject: string, recipients: string, text: string, attachment: Attachment) => {
  const to = recipients
    .split(",")
    .map((email) => email.trim())
    .filter(Boolean)
    .map((email) => ({ email, type: "to" }));

  const response = await mandrill().messages.send({
    message: {
      subject,
      text,
      html: text,
      from_email: YESME_MANDRILL_FROM_EMAIL,
      from_name: YESME_MANDRILL_FROM_NAME,
      to,
      bcc_address: YESME_MANDRILL_BCC_ADDRESS || undefined,
      attachments: [attachment],
    },
  });

  if (!Array.isArray(response)) {
    const detail = response?.response?.data?.message || response?.message || "unknown error";
    throw new Error(`Mandrill send failed: ${detail}`);
  }
  const failed = response.filter((result: any) => result.status === "rejected" || result.status === "invalid");
  if (failed.length) {
    throw new Error(`Mandrill rejected: ${failed.map((result: any) => `${result.email} (${result.reject_reason || result.status})`).join(", ")}`);
  }
  return response;
};
