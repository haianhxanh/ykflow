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
exports.update_inquiry = void 0;
const constants_1 = require("./../utils/constants");
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = __importDefault(require("dotenv"));
const inquiry_model_1 = __importDefault(require("../model/inquiry.model"));
const helpers_1 = require("../utils/helpers");
const notification_1 = require("../utils/notification");
dotenv_1.default.config();
const { ACCESS_TOKEN, STORE, API_VERSION } = process.env;
/*-------------------------------------RECEIVE INQUIRY-----------------------------------------*/
const update_inquiry = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.body.id || !req.body.status) {
            return res.status(422).json({
                message: "Missing inquiry ID or status",
            });
        }
        /*---------------------------------UPDATE DATABASE-------------------------------------*/
        const update_status = yield inquiry_model_1.default.update({ status: req.body.status }, {
            where: {
                id: req.body.id,
            },
        });
        /*---------------------------------UPDATE SHOPIFY-------------------------------------*/
        const inquiry = yield inquiry_model_1.default.findOne({
            where: {
                id: req.body.id,
            },
        });
        const order_metafields_data = yield axios_1.default.get(`https://${STORE}/admin/api/${API_VERSION}/orders/${inquiry.order_id}/metafields.json`, {
            headers: {
                "Content-Type": "application/json",
                "X-Shopify-Access-Token": ACCESS_TOKEN,
            },
        });
        let metafields = order_metafields_data.data.metafields;
        const metafield_inquiry = order_metafields_data.data.metafields.find((metafield) => {
            return metafield.namespace === "flow" && metafield.key === "inquiries";
        });
        let metafield_inquiry_value_array = JSON.parse(metafield_inquiry.value);
        let inquiryIndex = metafield_inquiry_value_array.findIndex((item) => parseInt(item.id) == parseInt(inquiry.id));
        metafield_inquiry_value_array[inquiryIndex].status =
            req.body.status == constants_1.STATUS.APPROVED ? constants_1.STATUS.APPROVED : constants_1.STATUS.DECLINED;
        let body = JSON.stringify({
            metafield: {
                namespace: "flow",
                key: "inquiries",
                type: "json",
                value: JSON.stringify(metafield_inquiry_value_array),
            },
        });
        const order_metafield_update = yield axios_1.default.post(`https://${STORE}/admin/api/${API_VERSION}/orders/${inquiry.order_id}/metafields.json`, body, {
            headers: {
                "Content-Type": "application/json",
                "X-Shopify-Access-Token": ACCESS_TOKEN,
            },
        });
        let pauseStartDate = (0, helpers_1.convertDateToISOString)(inquiry.pause_start_date);
        let pauseEndDate = (0, helpers_1.convertDateToISOString)(inquiry.pause_end_date);
        let newStartDate = (0, helpers_1.convertDateToISOString)(inquiry.new_start_date);
        let newEndDate = (0, helpers_1.convertDateToISOString)(inquiry.new_end_date);
        const shopify_order = yield axios_1.default.get(`https://${STORE}/admin/api/${API_VERSION}/orders/${inquiry.order_id}.json`, {
            headers: {
                "Content-Type": "application/json",
                "X-Shopify-Access-Token": ACCESS_TOKEN,
            },
        });
        let order_attributes = shopify_order.data.order.note_attributes;
        order_attributes.push({
            name: "NOVÉ Datum začátku",
            value: newStartDate,
        });
        order_attributes.push({
            name: "NOVÉ Datum ukončení",
            value: newEndDate,
        });
        const order_attributes_update = yield axios_1.default.put(`https://${STORE}/admin/api/${API_VERSION}/orders/${inquiry.order_id}.json`, {
            order: {
                id: inquiry.order_id,
                note_attributes: order_attributes,
            },
        }, {
            headers: {
                "Content-Type": "application/json",
                "X-Shopify-Access-Token": ACCESS_TOKEN,
            },
        });
        if (req.body.status == constants_1.STATUS.APPROVED && inquiry) {
            let message = `Váš požadavek o pozastavení krabičky ${inquiry.item_title} (obj. č. ${inquiry.order_name}) od ${pauseStartDate} do ${pauseEndDate} (včetně) byl schválen. Krabičky budeme nově rozvážet od  ${newStartDate} do ${newEndDate} (včetně).`;
            let notificationSubject = `Vaše žádost o pozastavení Yes Krabičky (obj. ${inquiry.order_name}) byla schválena`;
            const sendNotificationToMerchant = yield (0, notification_1.sendNotification)(notificationSubject, inquiry.order_contact, message);
        }
        return res.status(200).json({
            message: `Status of the inquiry has been updated`,
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal server error" });
    }
});
exports.update_inquiry = update_inquiry;
