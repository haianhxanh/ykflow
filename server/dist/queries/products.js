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
exports.allProductsQuery = exports.productsQuery = void 0;
const graphql_request_1 = require("graphql-request");
const axios_1 = __importDefault(require("axios"));
const dotenv_1 = __importDefault(require("dotenv"));
const util_1 = require("util");
dotenv_1.default.config();
const { ACCESS_TOKEN, STORE, API_VERSION } = process.env;
const sleep = (0, util_1.promisify)(setTimeout);
exports.productsQuery = (0, graphql_request_1.gql) `
  query ($query: String) {
    products(first: 250, query: $query) {
      edges {
        node {
          id
        }
      }
    }
  }
`;
function allProductsQuery(query) {
    return __awaiter(this, void 0, void 0, function* () {
        let cursor = "";
        let hasNextPage = true;
        let products = [];
        while (hasNextPage) {
            const response = yield axios_1.default.post(`https://${STORE}/admin/api/${API_VERSION}/graphql.json`, {
                query: `query{
          products(query: "${query}", first: 250${cursor ? `, after: "${cursor}"` : ""}) {
            pageInfo {
              hasNextPage
              endCursor
            }
            edges {
              node {
                id
                title
                variants(first: 250) {
                  edges {
                    node {
                      title
                      price
                      sku
                    }
                  }
                }           
              }
            }
          }
        }`,
            }, {
                headers: {
                    "Content-Type": "application/json",
                    "X-Shopify-Access-Token": ACCESS_TOKEN,
                },
            });
            const data = response.data.data.products;
            hasNextPage = data.pageInfo.hasNextPage;
            cursor = data.pageInfo.endCursor;
            products = products.concat(data.edges);
            yield sleep(250);
        }
        return products;
    });
}
exports.allProductsQuery = allProductsQuery;
