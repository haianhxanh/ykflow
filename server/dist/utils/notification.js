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
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifyMerchant = void 0;
require("dotenv/config");
const mailersend_1 = require("mailersend");
const { MAILERSEND_API_TOKEN, SENDER_EMAIL, SENDER_NAME, REPLY_EMAIL } = process.env;
const notifyMerchant = (customerEmail, message) => __awaiter(void 0, void 0, void 0, function* () {
    const mailerSend = new mailersend_1.MailerSend({
        apiKey: MAILERSEND_API_TOKEN,
    });
    const replyEmail = REPLY_EMAIL;
    const sentFrom = new mailersend_1.Sender(SENDER_EMAIL, SENDER_NAME);
    const recipients = [new mailersend_1.Recipient(customerEmail, "Zákazník")];
    const emailParams = new mailersend_1.EmailParams()
        .setFrom(sentFrom)
        .setTo(recipients)
        .setInReplyTo(replyEmail)
        .setCc([new mailersend_1.Recipient(replyEmail, "Yes Krabičky")])
        .setSubject("Nová žádost o pozastavení Yes Krabičky - neodpovídejte na tento email.")
        .setHtml(message);
    yield mailerSend.email.send(emailParams);
});
exports.notifyMerchant = notifyMerchant;
