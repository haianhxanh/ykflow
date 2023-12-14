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
        const update_status = yield inquiry_model_1.default.update({ status: req.body.status }, {
            where: {
                id: req.body.id,
            },
        });
        // update Shopify
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
        let inquiries = JSON.parse(metafields[0].value);
        let inquiryItem = inquiries.find((item) => parseInt(item.item.id) == parseInt(inquiry.item_id));
        let inquiryIndex = inquiries.findIndex((item) => parseInt(item.details.inquiry_id) == parseInt(inquiry.id));
        inquiries[inquiryIndex].details.status =
            req.body.status == constants_1.STATUS.APPROVED
                ? constants_1.STATUS_STRINGS.APPROVED
                : constants_1.STATUS_STRINGS.DECLINED;
        let array = [];
        let order_metafield_value = {
            item: {
                id: inquiry.item_id,
                title: inquiry.item_title,
            },
            details: {
                inquiry_id: inquiry.id,
                pause_start_date: inquiry.pause_start_date,
                pause_end_date: inquiry.pause_end_date,
                requested: true,
                status: constants_1.STATUS.APPROVED
                    ? constants_1.STATUS_STRINGS.APPROVED
                    : constants_1.STATUS_STRINGS.DECLINED,
            },
        };
        array.push(order_metafield_value);
        let body = JSON.stringify({
            metafield: {
                namespace: "flow",
                key: "inquiries",
                type: "json",
                value: JSON.stringify(array),
            },
        });
        const order_metafield_update = yield axios_1.default.post(`https://${STORE}/admin/api/${API_VERSION}/orders/${inquiry.order_id}/metafields.json`, body, {
            headers: {
                "Content-Type": "application/json",
                "X-Shopify-Access-Token": ACCESS_TOKEN,
            },
        });
        // inquiries[inquiryIndexIndex].value = "Laila";
        // const obj: {
        //   namespace: string;
        //   key: string;
        //   value: string;
        //   type: string;
        // } = {
        //   namespace: metafields[0].namespace,
        //   key: metafields[0].key,
        //   // value: .value,
        //   type: metafields[0].type,
        // };
        // let metafields_inquiries_array: InquiryMetafield[] = [];
        // metafields.forEach((metafield: any) => {
        //   const obj: {
        //     namespace: string;
        //     key: string;
        //     value: string;
        //     type: string;
        //   } = {
        //     namespace: metafield.namespace,
        //     key: metafield.key,
        //     value: metafield.value,
        //     type: metafield.type,
        //   };
        //   metafields_inquiries_array.push(obj);
        // });
        // let metafields_inquiry = metafields_inquiries_array.find(
        //   (metafield: InquiryMetafield) => metafield.key == "inquiries"
        // );
        // let metafields_array = JSON.parse(metafields);
        // console.log(metafields_inquiry);
        // let inquiryItem = metafields_array.find(
        //   (item: any) => parseInt(item.id) == parseInt(inquiry.item_id)
        // );
        // console.log(inquiryItem);
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
