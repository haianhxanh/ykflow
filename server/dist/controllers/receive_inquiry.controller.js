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
exports.receive_inquiry = void 0;
const helpers_1 = require("./../utils/helpers");
const constants_1 = require("./../utils/constants");
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = __importDefault(require("dotenv"));
const inquiry_model_1 = __importDefault(require("../model/inquiry.model"));
const constants_2 = require("../utils/constants");
const helpers_2 = require("../utils/helpers");
const notification_1 = require("../utils/notification");
dotenv_1.default.config();
const { ACCESS_TOKEN, STORE, API_VERSION } = process.env;
/*-------------------------------------RECEIVE INQUIRY-----------------------------------------*/
const receive_inquiry = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        // catch missing content
        if (!req.body.pause_start_date ||
            !req.body.pause_end_date ||
            !req.body.item_title ||
            !req.body.order_id ||
            !req.body.order_contact ||
            !req.body.order_name) {
            let errors = [];
            if (!req.body.pause_start_date || !req.body.pause_end_date)
                errors.push(constants_1.API_RESPONSES.MISSING_DATE);
            if (!req.body.item_title)
                errors.push(constants_1.API_RESPONSES.MISSING_ORDER_ITEM);
            if (!req.body.order_contact)
                errors.push(constants_1.API_RESPONSES.MISSING_ORDER_CONTACT);
            if (!req.body.order_name)
                errors.push(constants_1.API_RESPONSES.MISSING_ORDER_NAME);
            if (!req.body.order_id)
                errors.push(constants_1.API_RESPONSES.MISSING_ORDER_ID);
            if (!req.body.pause_start_date ||
                !req.body.pause_end_date ||
                !req.body.item_title ||
                !req.body.order_contact ||
                !req.body.order_name ||
                !req.body.order_id)
                return res.status(422).json({
                    errors: errors,
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
        let date = new Date();
        let today_date = date.toISOString().split("T")[0];
        /*---------------------------------INPUT VALIDATION I.-------------------------------------*/
        let errors_validation = [];
        // catch pause start date / pause end date in the past
        if ((0, helpers_2.convertDateToISOString)(start_date) > pause_start_date ||
            today_date >= pause_start_date ||
            (0, helpers_2.convertDateToISOString)(start_date) > pause_end_date)
            errors_validation.push(constants_1.API_RESPONSES.PAST_DATE);
        // catch pause end date before pause start date
        if (pause_start_date > pause_end_date)
            errors_validation.push(constants_1.API_RESPONSES.INVALID_END_DATE);
        // pause dates must be weekdays
        if ((0, helpers_2.isWeekDay)(pause_start_date) == false ||
            (0, helpers_2.isWeekDay)(pause_end_date) == false)
            errors_validation.push(constants_1.API_RESPONSES.NOT_WORKING_DAY);
        /*---------------------------------DATES CALCULATION-------------------------------------*/
        // calc total package days length
        let package_days_length = parseInt(req.body.item_title.split("(")[1].split(")")[0].split(" dní"));
        // calc days used (excl. weekends)
        let package_days_used = (0, helpers_2.getBusinessDatesCount)(
        // parse start_date from Shopify admin
        (0, helpers_2.convertDateToISOString)(start_date), req.body.pause_start_date);
        /*---------------------------------INPUT VALIDATION II.-------------------------------------*/
        let package_days_left = package_days_length - package_days_used;
        if (package_days_left <= 0)
            errors_validation.push(constants_1.API_RESPONSES.OUT_OF_RANGE);
        /*---------------------------------RETURN ALL VALIDATION ERRORS-------------------------------------*/
        if ((0, helpers_2.convertDateToISOString)(start_date) > pause_start_date ||
            today_date >= pause_start_date ||
            (0, helpers_2.convertDateToISOString)(start_date) > pause_end_date ||
            pause_start_date > pause_end_date ||
            (0, helpers_2.isWeekDay)(pause_start_date) == false ||
            (0, helpers_2.isWeekDay)(pause_end_date) == false ||
            package_days_left <= 0) {
            return res.status(422).json({
                errors: errors_validation,
            });
        }
        /*------------------------------PASSED ALL INPUT VALIDATIONS----------------------------------*/
        let package_new_start_date = (0, helpers_2.getFutureBusinessDate)(pause_end_date, 1);
        let package_new_end_date = (0, helpers_2.getFutureBusinessDate)(pause_end_date, package_days_left);
        /*---------------------------------NEW RECORD IN DATABASE-------------------------------------*/
        const new_inquiry = yield inquiry_model_1.default.create({
            order_name: req.body.order_name,
            order_id: req.body.order_id,
            order_contact: req.body.order_contact,
            pause_start_date: req.body.pause_start_date,
            pause_end_date: req.body.pause_end_date,
            item_title: req.body.item_title,
            item_id: req.body.item_id,
            new_start_date: package_new_start_date,
            new_end_date: package_new_end_date,
            status: constants_1.STATUS.NEW,
            request_date: today_date,
            note: req.body.note,
        });
        /*---------------------------------UPDATE ORDER METAFIELDS-------------------------------------*/
        const order_metafields_data = yield axios_1.default.get(`https://${STORE}/admin/api/${API_VERSION}/orders/${req.body.order_id}/metafields.json`, {
            headers: {
                "Content-Type": "application/json",
                "X-Shopify-Access-Token": ACCESS_TOKEN,
            },
        });
        if (res.statusCode == 200) {
            if (order_metafields_data.data.metafields.length == 0 ||
                order_metafields_data.data.metafields.find((metafield) => {
                    return (metafield.namespace === "flow" && metafield.key === "inquiries");
                }) == undefined) {
                // create order metafield
                let array = [];
                array.push(new_inquiry.dataValues);
                let body = JSON.stringify({
                    metafield: {
                        namespace: "flow",
                        key: "inquiries",
                        type: "json",
                        value: JSON.stringify(array),
                    },
                });
                setTimeout(() => __awaiter(void 0, void 0, void 0, function* () {
                    const order_metafield_create = yield axios_1.default.post(`https://${STORE}/admin/api/${API_VERSION}/orders/${req.body.order_id}/metafields.json`, body, {
                        headers: {
                            "Content-Type": "application/json",
                            "X-Shopify-Access-Token": ACCESS_TOKEN,
                        },
                    });
                }), 1000);
            }
            else {
                // update order metafield
                const metafield_inquiry = order_metafields_data.data.metafields.find((metafield) => {
                    return (metafield.namespace === "flow" && metafield.key === "inquiries");
                });
                let metafield_inquiry_value_array = JSON.parse(metafield_inquiry.value);
                metafield_inquiry_value_array.push(new_inquiry.dataValues);
                let body = JSON.stringify({
                    metafield: {
                        namespace: "flow",
                        key: "inquiries",
                        type: "json",
                        value: JSON.stringify(metafield_inquiry_value_array),
                    },
                });
                setTimeout(() => __awaiter(void 0, void 0, void 0, function* () {
                    const order_metafield_create = yield axios_1.default.post(`https://${STORE}/admin/api/${API_VERSION}/orders/${req.body.order_id}/metafields.json`, body, {
                        headers: {
                            "Content-Type": "application/json",
                            "X-Shopify-Access-Token": ACCESS_TOKEN,
                        },
                    });
                }), 1000);
            }
        }
        /*-------------------------------------SUCCESS RESPONSE-----------------------------------------*/
        let message = `Přijali jsme Váš požadavek o pozastavení krabičky ${req.body.item_title} od ${(0, helpers_1.convertDateToLocalString)(pause_start_date)} do ${(0, helpers_1.convertDateToLocalString)(pause_end_date)} (včetně). V nejbližší době se Vám ozveme o potvrzení požadavku.`;
        /*-------------------------------------NOTIFY MERCHANT AND CUSTOMER -----------------------------------------*/
        const sendNotificationToMerchant = yield (0, notification_1.notifyMerchant)(req.body.order_name, req.body.order_contact, message);
        return res.status(200).json({
            request_id: `ID požadavku: ${new_inquiry.id}`,
            message: message,
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal server error" });
    }
});
exports.receive_inquiry = receive_inquiry;
