"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.shopifyClient = void 0;
const graphql_request_1 = require("graphql-request");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const { ACCESS_TOKEN, STORE, API_VERSION } = process.env;
exports.shopifyClient = new graphql_request_1.GraphQLClient(`https://${STORE}/admin/api/${API_VERSION}/graphql.json`, {
    // @ts-ignore
    headers: {
        "X-Shopify-Access-Token": ACCESS_TOKEN,
    },
});
