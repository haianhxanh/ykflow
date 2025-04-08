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
exports.getEasterDiscount = void 0;
const easterDiscount_model_1 = __importDefault(require("../model/easterDiscount.model"));
const graphql_request_1 = require("graphql-request");
const dotenv_1 = __importDefault(require("dotenv"));
const discounts_1 = require("../queries/discounts");
const notification_1 = require("../utils/notification");
const easterEmailContent_1 = require("../utils/easterEmailContent");
dotenv_1.default.config();
const { ACCESS_TOKEN, STORE, API_VERSION, MANDRILL_MESSAGE_BCC_ADDRESS_DEV } = process.env;
const discountRules = [
    {
        discount_type: "a",
        discount_percentage: 70,
        discount_limit: 1,
    },
    {
        discount_type: "b",
        discount_percentage: 35,
        discount_limit: 3,
    },
    {
        discount_type: "c",
        discount_percentage: 20,
        discount_limit: 10,
    },
    {
        discount_type: "d",
        discount_percentage: 15,
        discount_limit: 10,
    },
];
const getEasterDiscount = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { email } = req.body;
    const randomDiscount = getRandomDiscount();
    const selectedDiscount = yield easterDiscount_model_1.default.findAll({
        where: {
            discount_type: randomDiscount.discount_type,
        },
    });
    const finalDiscount = {
        discount_type: selectedDiscount.length < randomDiscount.discount_limit ? randomDiscount.discount_type : "default",
        discount_percentage: selectedDiscount.length < randomDiscount.discount_limit ? randomDiscount.discount_percentage : 10,
    };
    let code = generateDiscountCode(finalDiscount.discount_percentage);
    let isCodeUnique = false;
    while (!isCodeUnique) {
        const existingDiscount = yield easterDiscount_model_1.default.findAll({ where: { discount_code: code } });
        if (existingDiscount.length === 0) {
            isCodeUnique = true;
        }
        else {
            code = generateDiscountCode(finalDiscount.discount_percentage);
        }
    }
    const shopifyDiscount = yield createNewShopifyDiscount(finalDiscount.discount_percentage, email, code);
    if (shopifyDiscount.discountCodeBasicCreate.userErrors.length > 0) {
        return res.status(400).json({
            message: shopifyDiscount.discountCodeBasicCreate.userErrors[0].message,
            error: true,
        });
    }
    const newDiscount = yield easterDiscount_model_1.default.create({
        discount_type: finalDiscount.discount_type,
        discount_percentage: finalDiscount.discount_percentage,
        discount_code: code,
        email: email,
    });
    // Send email to customer
    const emailContent = (0, easterEmailContent_1.easterHtmlContent)(code, finalDiscount.discount_percentage);
    const sendEmail = yield (0, notification_1.sendNotification)("Velikonoční nadílka právě dorazila!", email, emailContent, MANDRILL_MESSAGE_BCC_ADDRESS_DEV, null, false);
    return res.status(200).json({
        shopifyDiscount: shopifyDiscount,
        discount: newDiscount.dataValues,
        email: sendEmail,
    });
});
exports.getEasterDiscount = getEasterDiscount;
const createNewShopifyDiscount = (percentage, email, code) => __awaiter(void 0, void 0, void 0, function* () {
    const client = new graphql_request_1.GraphQLClient(`https://${STORE}/admin/api/${API_VERSION}/graphql.json`, {
        // @ts-ignore
        headers: {
            "X-Shopify-Access-Token": ACCESS_TOKEN,
        },
    });
    const discountCode = yield client.request(discounts_1.createDiscountCodeMutation, {
        basicCodeDiscount: {
            title: code,
            code: code,
            customerSelection: {
                all: true,
            },
            customerGets: {
                value: {
                    percentage: percentage / 100,
                },
                items: {
                    all: true,
                },
            },
            startsAt: new Date().toISOString(),
            usageLimit: 1,
            appliesOncePerCustomer: true,
        },
    });
    return discountCode;
});
const generateDiscountCode = (percentage) => {
    const consonants = generateConsonants();
    const code = `EASTER${percentage}${consonants}`;
    return code;
};
const generateConsonants = () => {
    const consonants = "bcdfghjklmnpqrstvwxyz";
    const randomConsonants = consonants[Math.floor(Math.random() * consonants.length)] +
        consonants[Math.floor(Math.random() * consonants.length)] +
        consonants[Math.floor(Math.random() * consonants.length)];
    return randomConsonants.toUpperCase();
};
const getRandomDiscount = () => {
    const randomIndex = Math.floor(Math.random() * discountRules.length);
    return discountRules[randomIndex];
};
