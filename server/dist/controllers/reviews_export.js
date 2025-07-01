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
exports.reviews_export = void 0;
const exceljs_1 = __importDefault(require("exceljs"));
const dotenv_1 = __importDefault(require("dotenv"));
const rating_model_1 = __importDefault(require("../model/rating.model"));
const sequelize_1 = require("sequelize");
const meal_rating_controller_1 = require("./meal_rating.controller");
const notification_1 = require("../utils/notification");
const graphql_request_1 = require("graphql-request");
const customers_1 = require("../queries/customers");
dotenv_1.default.config();
const { ORDER_EXPORT_RECIPIENTS, MANDRILL_MESSAGE_BCC_ADDRESS_DEV } = process.env;
const { ACCESS_TOKEN, STORE, API_VERSION } = process.env;
const recipientEmails = ORDER_EXPORT_RECIPIENTS;
/*-------------------------------------MAIN FUNCTION------------------------------------------------*/
const reviews_export = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const { precedingMonday, lastSunday } = getLastSundayAndPrecedingMonday();
        const ratings = yield rating_model_1.default.findAll({
            where: {
                createdAt: {
                    [sequelize_1.Op.between]: [`${precedingMonday}T00:00:00.000Z`, `${lastSunday}T23:59:59.999Z`],
                },
            },
        });
        if (!ratings) {
            return res.status(404).json({ error: "No ratings found" });
        }
        // group by recipe_type
        const recipeTypeRatings = ratings.reduce((acc, rating) => {
            if (!acc[rating.recipe_type]) {
                acc[rating.recipe_type] = [];
            }
            acc[rating.recipe_type].push(rating);
            return acc;
        }, {});
        const workbook = new exceljs_1.default.Workbook();
        for (let i = 0; i < 5; i++) {
            const mealType = meal_rating_controller_1.meals && ((_a = meal_rating_controller_1.meals[i]) === null || _a === void 0 ? void 0 : _a.name);
            const worksheet = workbook.addWorksheet(`${mealType}`);
            worksheet.columns = [
                { header: "Recipe Name", key: "recipe_name", width: 20 },
                { header: "Type", key: "recipe_type", width: 20 },
                { header: "Rating", key: "rating", width: 10 },
                { header: "Comment", key: "comment", width: 20 },
                { header: "User", key: "user", width: 50 },
                { header: "User Profile", key: "userProfile", width: 50 },
            ];
            const sortedRecipeTypeRatings = recipeTypeRatings[mealType].sort((a, b) => a.recipe_name.localeCompare(b.recipe_name));
            for (const rating of sortedRecipeTypeRatings) {
                const shopifyUser = rating.shopify_user_id ? yield client.request(customers_1.customerQuery, { id: `gid://shopify/Customer/${rating.shopify_user_id}` }) : null;
                const user = (shopifyUser === null || shopifyUser === void 0 ? void 0 : shopifyUser.customer) ? `${shopifyUser.customer.firstName} ${shopifyUser.customer.lastName} (${shopifyUser.customer.email})` : "";
                const userAdminUrl = (shopifyUser === null || shopifyUser === void 0 ? void 0 : shopifyUser.customer) ? `https://${STORE}/admin/customers/${rating.shopify_user_id}` : "";
                worksheet.addRow({
                    recipe_name: rating.recipe_name,
                    recipe_type: rating.recipe_type,
                    rating: rating.rating,
                    comment: rating.comment,
                    user: user,
                    userProfile: userAdminUrl,
                });
            }
        }
        const weekNumber = getWeekNumber(precedingMonday);
        yield workbook.xlsx.writeFile(`hodnoceni-receptu-tyden-${weekNumber}.xlsx`);
        const buffer = yield workbook.xlsx.writeBuffer();
        const base64Content = Buffer.from(buffer).toString("base64");
        let attachment = {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            name: `hodnoceni-receptu-tyden-${weekNumber}.xlsx`,
            content: base64Content,
        };
        const sendEmail = yield (0, notification_1.sendNotification)(`Hodnocení receptů od ${czechDate(precedingMonday)} do ${czechDate(lastSunday)}`, recipientEmails, `Hodnocení receptů od ${czechDate(precedingMonday)} do ${czechDate(lastSunday)} jsou připravena k exportu`, null, MANDRILL_MESSAGE_BCC_ADDRESS_DEV, attachment, true);
        return res.status(200).json(attachment);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal server error" });
    }
});
exports.reviews_export = reviews_export;
function getLastSundayAndPrecedingMonday() {
    let today = new Date();
    let dayOfWeek = today.getDay();
    let lastSunday = new Date(today);
    lastSunday.setDate(today.getDate() - dayOfWeek - (dayOfWeek === 0 ? 7 : 0));
    let precedingMonday = new Date(lastSunday);
    precedingMonday.setDate(lastSunday.getDate() - 6);
    return {
        precedingMonday: precedingMonday.toISOString().split("T")[0],
        lastSunday: lastSunday.toISOString().split("T")[0],
    };
}
function getWeekNumber(mondayDate) {
    let date = new Date(mondayDate);
    date.setHours(0, 0, 0, 0);
    let firstThursday = new Date(date.getFullYear(), 0, 4);
    firstThursday.setDate(firstThursday.getDate() - ((firstThursday.getDay() + 6) % 7));
    let diff = Math.round((date - firstThursday) / (7 * 24 * 60 * 60 * 1000));
    return diff + 1;
}
function czechDate(date) {
    const dateObj = new Date(date);
    const day = dateObj.getDate();
    const month = dateObj.getMonth() + 1;
    const year = dateObj.getFullYear();
    return `${day}.${month}.${year}`;
}
const client = new graphql_request_1.GraphQLClient(`https://${STORE}/admin/api/${API_VERSION}/graphql.json`, {
    // @ts-ignore
    headers: {
        "X-Shopify-Access-Token": ACCESS_TOKEN,
    },
});
