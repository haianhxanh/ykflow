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
exports.custom_email = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const notification_1 = require("../utils/notification");
dotenv_1.default.config();
const { ORDER_EXPORT_RECIPIENTS, MANDRILL_MESSAGE_BCC_ADDRESS_DEV } = process.env;
const recipientEmails = ORDER_EXPORT_RECIPIENTS;
/*-------------------------------------MAIN FUNCTION------------------------------------------------*/
const custom_email = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { recipient, revisedInvoiceNo, invoiceNo, invoiceUrl } = req.query;
        if (!recipient || !revisedInvoiceNo || !invoiceNo || !invoiceUrl) {
            return res.status(400).json({ error: "Missing required parameters" });
        }
        const subject = `Omluva za chybně zaslaný doklad`;
        const content = `Dobrý den,
      <p>
        omlouváme se, ale při zpracování Vaší objednávky došlo k technické chybě, kvůli které jsme Vám omylem zaslali opravný daňový doklad <strong>${revisedInvoiceNo}</strong>, který není platný.
      </p>
      <p>
        Původní faktura <a href="${invoiceUrl}">${invoiceNo}</a>, kterou jste obdrželi jako první, je v pořádku a nadále platí. Není potřeba podnikat žádné další kroky.
      </p>
      <p>
        Omlouváme se za případné zmatky a děkujeme za pochopení.
      </p>
      <footer>
        S přáním hezkého dne,<br>
        Yes Krabičky
      </footer>`;
        const attachment = null;
        const showSignature = false;
        const bbcEmail = "";
        // return res.status(200).json({ recipient, invoiceNo, subject, content, attachment, showSignature, bbcEmail });
        const sendEmail = yield (0, notification_1.sendNotification)(subject, recipient, content, bbcEmail, attachment, showSignature);
        return res.status(200).send(sendEmail);
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Error" });
    }
});
exports.custom_email = custom_email;
