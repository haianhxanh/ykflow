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
exports.custom_email_2 = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const notification_1 = require("../utils/notification");
dotenv_1.default.config();
const { ORDER_EXPORT_RECIPIENTS, MANDRILL_MESSAGE_BCC_ADDRESS_DEV } = process.env;
const recipientEmails = ORDER_EXPORT_RECIPIENTS;
/*-------------------------------------MAIN FUNCTION------------------------------------------------*/
const custom_email_2 = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { recipient, orderNumber } = req.query;
        if (!recipient || !orderNumber) {
            return res.status(400).json({ error: "Missing required parameters" });
        }
        const subject = `Omluva za chybnou fakturu`;
        const content = `Dobrý den,
      <p>
        omlouváme se, při vystavení faktury k Vaší objednávce ${orderNumber} došlo k chybě - faktura obsahuje poplatek za výdejní místo, přestože Vám nebyl ve skutečnosti účtován.
      </p>
      <p>
        Objednávka je v pořádku zaplacená a zpracovává se. V nejbližších dnech Vám zašleme opravný daňový doklad. Není třeba podnikat žádné další kroky.
      </p>
      <p>
        Děkujeme za pochopení a omlouváme se za zmatky.
      </p>
      <footer>
        S přáním hezkého dne,<br>
        Yes Krabičky
      </footer>`;
        const attachment = null;
        const showSignature = false;
        const bbcEmail = "";
        // return res.status(200).json({ recipient, invoiceNo, subject, content, attachment, showSignature, bbcEmail });
        const sendEmail = yield (0, notification_1.sendNotification)(subject, recipient, content, null, bbcEmail, attachment, showSignature);
        return res.status(200).send(sendEmail);
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Error" });
    }
});
exports.custom_email_2 = custom_email_2;
