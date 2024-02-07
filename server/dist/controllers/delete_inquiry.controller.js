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
exports.delete_inquiry = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const inquiry_model_1 = __importDefault(require("../model/inquiry.model"));
dotenv_1.default.config();
const { ACCESS_TOKEN, STORE, API_VERSION } = process.env;
/*-------------------------------------RECEIVE INQUIRY-----------------------------------------*/
const delete_inquiry = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.body.id) {
            return res.status(422).json({
                message: "Missing inquiry ID",
            });
        }
        /*---------------------------------UPDATE DATABASE-------------------------------------*/
        const update_status = yield inquiry_model_1.default.destroy({
            where: {
                id: req.body.id,
            },
        });
        /*---------------------------------UPDATE SHOPIFY-------------------------------------*/
        // const inquiry: any = await Inquiry.findOne({
        //   where: {
        //     id: req.body.id,
        //   },
        // });
        // const order_metafields_data = await axios.get(
        //   `https://${STORE}/admin/api/${API_VERSION}/orders/${inquiry.order_id}/metafields.json`,
        //   {
        //     headers: {
        //       "Content-Type": "application/json",
        //       "X-Shopify-Access-Token": ACCESS_TOKEN!,
        //     },
        //   }
        // );
        // let metafields = order_metafields_data.data.metafields;
        // const metafield_inquiry = order_metafields_data.data.metafields.find(
        //   (metafield: any) => {
        //     return metafield.namespace === "flow" && metafield.key === "inquiries";
        //   }
        // );
        // let metafield_inquiry_value_array = JSON.parse(metafield_inquiry.value);
        // let inquiryIndex = metafield_inquiry_value_array.findIndex(
        //   (item: any) => parseInt(item.id) == parseInt(inquiry.id)
        // );
        // metafield_inquiry_value_array[inquiryIndex].status =
        //   req.body.status == STATUS.APPROVED ? STATUS.APPROVED : STATUS.DECLINED;
        // let body = JSON.stringify({
        //   metafield: {
        //     namespace: "flow",
        //     key: "inquiries",
        //     type: "json",
        //     value: JSON.stringify(metafield_inquiry_value_array),
        //   },
        // });
        // const order_metafield_update: any = await axios.post(
        //   `https://${STORE}/admin/api/${API_VERSION}/orders/${inquiry.order_id}/metafields.json`,
        //   body,
        //   {
        //     headers: {
        //       "Content-Type": "application/json",
        //       "X-Shopify-Access-Token": ACCESS_TOKEN!,
        //     },
        //   }
        // );
        return res.status(200).json({
            message: `Status of the inquiry has been updated`,
        });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal server error" });
    }
});
exports.delete_inquiry = delete_inquiry;
