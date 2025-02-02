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
exports.meal_rating = void 0;
const graphql_request_1 = require("graphql-request");
const dotenv_1 = __importDefault(require("dotenv"));
const metafields_1 = require("../queries/metafields");
dotenv_1.default.config();
const { ACCESS_TOKEN, STORE, API_VERSION } = process.env;
const meal_rating = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const week = req.body.week;
        const day = req.body.day;
        const mealIndex = req.body.mealIndex;
        const rating = req.body.rating;
        console.log(`New rating for ${week}, ${days[day].name}, ${meals[mealIndex].name}: ${rating}`);
        const client = new graphql_request_1.GraphQLClient(`https://${STORE}/admin/api/${API_VERSION}/graphql.json`, {
            // @ts-ignore
            headers: {
                "X-Shopify-Access-Token": ACCESS_TOKEN,
            },
        });
        const meta = yield client.request(metafields_1.metaobjectsQuery, {
            query: `handle=${week}`,
            type: "week",
        });
        if (!meta.metaobjects.edges.length) {
            return res.status(404).json({ message: `Week ${week} not found` });
        }
        const dayRatingKey = `${days[day].name}_rating`;
        const mealName = meals[mealIndex].name;
        const ratingOfTheDay = meta.metaobjects.edges[0].node.fields.find((field) => field.key == dayRatingKey);
        let ratingOfTheDayValue;
        if (!ratingOfTheDay || !ratingOfTheDay.value) {
            ratingOfTheDayValue = {
                [mealName]: {
                    rating_count: 1,
                    rating_average: parseFloat(rating).toFixed(1),
                },
            };
        }
        else {
            ratingOfTheDayValue = JSON.parse(ratingOfTheDay.value);
            if (!ratingOfTheDayValue[mealName]) {
                ratingOfTheDayValue[mealName] = {
                    rating_count: 1,
                    rating_average: parseFloat(rating).toFixed(1),
                };
            }
            else {
                const oldRatingCount = ratingOfTheDayValue[mealName].rating_count;
                const newRatingCount = ratingOfTheDayValue[mealName].rating_count + 1;
                ratingOfTheDayValue[mealName].rating_count = newRatingCount;
                const newRatingAverage = (parseFloat(ratingOfTheDayValue[mealName].rating_average) *
                    oldRatingCount +
                    parseFloat(rating)) /
                    newRatingCount;
                ratingOfTheDayValue[mealName].rating_average =
                    newRatingAverage.toFixed(1);
            }
        }
        const updatedMetaobject = client.request(metafields_1.metaobjectUpdateMutation, {
            id: meta.metaobjects.edges[0].node.id,
            metaobject: {
                fields: [
                    {
                        key: dayRatingKey,
                        value: JSON.stringify(ratingOfTheDayValue),
                    },
                ],
            },
        });
        // console.log("Rating updated", ratingOfTheDayValue);
        return res.status(200).json({ message: "Rating submitted" });
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: "Internal Server Error" });
    }
});
exports.meal_rating = meal_rating;
const meals = {
    "0": {
        name: "breakfast",
    },
    "1": {
        name: "snack_1",
    },
    "2": {
        name: "lunch",
    },
    "3": {
        name: "snack_2",
    },
    "4": {
        name: "dinner",
    },
};
const days = {
    "day-0": {
        name: "monday",
    },
    "day-1": {
        name: "tuesday",
    },
    "day-2": {
        name: "wednesday",
    },
    "day-3": {
        name: "thursday",
    },
    "day-4": {
        name: "friday",
    },
};
