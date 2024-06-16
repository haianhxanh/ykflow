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
const { MANDRILL_API_KEY, MANDRILL_MESSAGE_FROM_EMAIL, MANDRILL_MESSAGE_FROM_NAME, MANDRILL_MESSAGE_BCC_ADDRESS, } = process.env;
const mailchimp = require("@mailchimp/mailchimp_transactional")(MANDRILL_API_KEY);
const notifyMerchant = (orderName, customerEmail, content) => __awaiter(void 0, void 0, void 0, function* () {
    // axios post request to send email
    const message = {
        text: content,
        html: content + "<br><br>---<br>Yes Krabičky",
        from_email: MANDRILL_MESSAGE_FROM_EMAIL,
        from_name: MANDRILL_MESSAGE_FROM_NAME,
        to: [
            {
                email: customerEmail,
                type: "to",
            },
        ],
        subject: `Nová žádost o pozastavení Yes Krabičky (obj. ${orderName})`,
        bcc_address: MANDRILL_MESSAGE_BCC_ADDRESS,
    };
    try {
        const response = sendEmail(message);
        return response;
    }
    catch (error) {
        console.log(error);
    }
});
exports.notifyMerchant = notifyMerchant;
function sendEmail(message) {
    return __awaiter(this, void 0, void 0, function* () {
        const response = yield mailchimp.messages.send({
            message,
        });
        return response;
    });
}
