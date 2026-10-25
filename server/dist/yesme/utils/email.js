"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendYesmeEmail = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
// Same Mandrill account as Yes Krabičky (MANDRILL_API_KEY), but Yes Mě's own sender and BCC.
const { MANDRILL_API_KEY, YESME_MANDRILL_FROM_EMAIL, YESME_MANDRILL_FROM_NAME, YESME_MANDRILL_BCC_ADDRESS } = process.env;
let client = null;
const mandrill = () => {
    if (!MANDRILL_API_KEY || !YESME_MANDRILL_FROM_EMAIL) {
        throw new Error("MANDRILL_API_KEY or YESME_MANDRILL_FROM_EMAIL is not configured");
    }
    client = client || require("@mailchimp/mailchimp_transactional")(MANDRILL_API_KEY);
    return client;
};
// Throws when Mandrill rejects the request or any recipient, so callers never report a failed send as emailed.
// (The Mandrill client returns errors instead of throwing them.)
const sendYesmeEmail = (subject, recipients, text, attachment) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    const to = recipients
        .split(",")
        .map((email) => email.trim())
        .filter(Boolean)
        .map((email) => ({ email, type: "to" }));
    const response = yield mandrill().messages.send({
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
        const detail = ((_b = (_a = response === null || response === void 0 ? void 0 : response.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || (response === null || response === void 0 ? void 0 : response.message) || "unknown error";
        throw new Error(`Mandrill send failed: ${detail}`);
    }
    const failed = response.filter((result) => result.status === "rejected" || result.status === "invalid");
    if (failed.length) {
        throw new Error(`Mandrill rejected: ${failed.map((result) => `${result.email} (${result.reject_reason || result.status})`).join(", ")}`);
    }
    return response;
});
exports.sendYesmeEmail = sendYesmeEmail;
