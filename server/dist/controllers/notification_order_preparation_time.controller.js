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
exports.notification_order_preparation_time = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const notification_1 = require("../utils/notification");
dotenv_1.default.config();
const { ORDER_EXPORT_RECIPIENTS, MANDRILL_MESSAGE_BCC_ADDRESS_DEV, MANDRILL_MESSAGE_FROM_EMAIL_2 } = process.env;
const recipientEmails = ORDER_EXPORT_RECIPIENTS;
/*-------------------------------------MAIN FUNCTION------------------------------------------------*/
const notification_order_preparation_time = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { orderName, orderEmail } = req.body;
        const content = `
    <p>Dobrý den,</p>
    <p>Zvolili jste vyzvednutí Vašich krabiček na odběrném místě <a href="https://maps.app.goo.gl/k2Z3ZyqAfHngWBN79">Cukrááárna - Mratín</a>. Vaše krabičky budou vždy připraveny k vyzvednutí v 16:00.</p>
    <p>Budeme se na Vás těšit.</p>
    <br>
    <p>EN</p>
    <p>Dear customer ,</p>
    <p>You have chosen to pick up your meal boxes at the <a href="https://maps.app.goo.gl/k2Z3ZyqAfHngWBN79">Cukrááárna - Mratín</a> pick-up point. Your boxes will always be ready for pickup at 16:00.</p>
    <p>We look forward to seeing you.</p>
    `;
        const bbcEmail = MANDRILL_MESSAGE_BCC_ADDRESS_DEV;
        const subject = "Yes Krabičky - Informace o vyzvednutí objednávky " + orderName;
        const fromEmail = MANDRILL_MESSAGE_FROM_EMAIL_2;
        const emailNotification = yield (0, notification_1.sendNotification)(subject, orderEmail, content, fromEmail, bbcEmail, null, true);
        return res.status(200).json({ message: emailNotification });
    }
    catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Error" });
    }
});
exports.notification_order_preparation_time = notification_order_preparation_time;
