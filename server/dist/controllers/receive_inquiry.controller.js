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
exports.receive_inquiries = void 0;
const constants_1 = require("./../utils/constants");
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = __importDefault(require("dotenv"));
const inquiry_model_1 = __importDefault(require("../model/inquiry.model"));
const constants_2 = require("../utils/constants");
const helpers_1 = require("../utils/helpers");
const uuid_1 = require("uuid");
dotenv_1.default.config();
const { ACCESS_TOKEN, STORE, API_VERSION } = process.env;
/*-------------------------------------RECEIVE INQUIRY-----------------------------------------*/
const receive_inquiries = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // catch missing content
        if (!req.body.pause_start_date ||
            !req.body.pause_end_date ||
            !req.body.item_title ||
            !req.body.order_id ||
            !req.body.order_contact ||
            !req.body.order_name) {
            if (!req.body.pause_start_date || !req.body.pause_end_date)
                return res.status(422).json({
                    message: constants_1.API_RESPONSES.MISSING_DATE,
                });
            if (!req.body.item_title)
                return res.status(422).json({
                    message: constants_1.API_RESPONSES.MISSING_ORDER_ITEM,
                });
            if (!req.body.order_contact)
                return res.status(422).json({
                    message: constants_1.API_RESPONSES.MISSING_ORDER_ITEM,
                });
            if (!req.body.order_name)
                return res.status(422).json({
                    message: constants_1.API_RESPONSES.MISSING_ORDER_NAME,
                });
            if (!req.body.order_id)
                return res.status(422).json({
                    message: constants_1.API_RESPONSES.MISSING_ORDER_ID,
                });
        }
        const order_data = yield axios_1.default.get(`https://${STORE}/admin/api/${API_VERSION}/orders/${req.body.order_id}.json`, {
            headers: {
                "Content-Type": "application/json",
                "X-Shopify-Access-Token": ACCESS_TOKEN,
            },
        });
        let start_date = order_data.data.order.note_attributes.find((attr) => attr.name == constants_2.STRINGS.ORDER_ATTR_START_DATE).value;
        let pause_start_date = req.body.pause_start_date;
        let pause_end_date = req.body.pause_end_date;
        // calc total package days length
        let package_days_length = parseInt(req.body.item_title.split("(")[1].split(")")[0].split(" dní"));
        // calc days used (excl. weekends)
        let package_days_used = (0, helpers_1.getBusinessDatesCount)(
        // parse start_date from Shopify admin
        (0, helpers_1.convertDateToISOString)(start_date), req.body.pause_start_date);
        let package_days_left = package_days_length - package_days_used;
        let package_new_end_date = (0, helpers_1.getFutureBusinessDate)(pause_end_date, package_days_left);
        let date = new Date();
        let today_date = date.toISOString().split("T")[0];
        const new_inquiry = yield inquiry_model_1.default.create({
            id: (0, uuid_1.v4)(),
            order_name: req.body.order_name,
            order_id: req.body.order_id,
            order_contact: req.body.order_contact,
            pause_start_date: req.body.pause_start_date,
            pause_end_date: req.body.pause_end_date,
            item_title: req.body.item_title,
            new_end_date: package_new_end_date,
            status: constants_1.STATUS.NEW,
            request_date: today_date,
        });
        /*-------------------------------------NOTIFY CUSTOMER-----------------------------------------*/
        /*-------------------------------------NOTIFY MERCHANT-----------------------------------------*/
        return res.status(200).json({
            message: `Váš požadavek byl zapsán do našeho systému. Požádala jste o pozastavení krabičky od ${pause_start_date} do ${pause_end_date} včetně. V nejbližší době se Vám ozveme o potvrzení požadavku`,
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal server error" });
    }
});
exports.receive_inquiries = receive_inquiries;
