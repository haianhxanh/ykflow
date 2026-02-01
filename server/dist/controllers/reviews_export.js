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
const helpers_1 = require("../utils/helpers");
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
    var _a, _b;
    try {
        const shouldSendEmail = req.query.sendEmail === "true";
        const { precedingMonday, lastSunday } = (0, helpers_1.getLastSundayAndPrecedingMonday)();
        const ratings = (_a = (yield rating_model_1.default.findAll({
            where: {
                // @ts-ignore
                createdAt: {
                    [sequelize_1.Op.between]: [`${precedingMonday}T00:00:00.000Z`, `${lastSunday}T23:59:59.999Z`],
                },
            },
        }))) === null || _a === void 0 ? void 0 : _a.filter((rating) => rating.meal_date >= new Date(precedingMonday) && rating.meal_date <= new Date(lastSunday));
        if (!ratings) {
            return res.status(404).json({ error: "No ratings found" });
        }
        // group by recipe_type
        const recipeTypeRatings = ratings.reduce((acc, rating) => {
            // @ts-ignore
            if (!acc[rating.recipe_type]) {
                acc[rating.recipe_type] = [];
            }
            acc[rating.recipe_type].push(rating);
            return acc;
        }, {});
        const workbook = new exceljs_1.default.Workbook();
        const worksheet = workbook.addWorksheet(`Všechna hodnocení`);
        worksheet.columns = [
            { header: "Recipe Name", key: "recipe_name", width: 50 },
            { header: "Type", key: "recipe_type", width: 20 },
            { header: "Meal Date", key: "meal_date", width: 10 },
            { header: "Rating", key: "rating", width: 10 },
            { header: "Comment", key: "comment", width: 20 },
            { header: "Keep Menu", key: "keep_menu", width: 10 },
            { header: "Keep Menu Note", key: "keep_menu_note", width: 20 },
            { header: "User", key: "user", width: 40 },
            { header: "User Profile", key: "userProfile", width: 40 },
        ];
        for (let i = 0; i < 5; i++) {
            // @ts-ignore
            const mealType = meal_rating_controller_1.meals && ((_b = meal_rating_controller_1.meals[i]) === null || _b === void 0 ? void 0 : _b.name);
            const sortedRecipeTypeRatings = recipeTypeRatings[mealType].sort((a, b) => a.recipe_name.localeCompare(b.recipe_name));
            for (const rating of sortedRecipeTypeRatings) {
                const shopifyUser = rating.shopify_user_id ? yield client.request(customers_1.customerQuery, { id: `gid://shopify/Customer/${rating.shopify_user_id}` }) : null;
                const user = (shopifyUser === null || shopifyUser === void 0 ? void 0 : shopifyUser.customer) ? `${shopifyUser.customer.firstName} ${shopifyUser.customer.lastName} (${shopifyUser.customer.email})` : "";
                const userAdminUrl = (shopifyUser === null || shopifyUser === void 0 ? void 0 : shopifyUser.customer) ? `https://${STORE}/admin/customers/${rating.shopify_user_id}` : "";
                worksheet.addRow({
                    recipe_name: rating.recipe_name,
                    recipe_type: rating.recipe_type,
                    meal_date: rating.meal_date,
                    rating: rating.rating,
                    comment: rating.comment,
                    keep_menu: rating.keep_menu != null ? (rating.keep_menu ? true : false) : null,
                    keep_menu_note: rating.keep_menu_note,
                    user: user,
                    userProfile: userAdminUrl,
                });
            }
        }
        const weekNumber = (0, helpers_1.getWeekNumber)(precedingMonday);
        yield workbook.xlsx.writeFile(`hodnoceni-receptu-tyden-${weekNumber}.xlsx`);
        const buffer = yield workbook.xlsx.writeBuffer();
        const base64Content = Buffer.from(buffer).toString("base64");
        const attachment = {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            name: `hodnoceni-receptu-tyden-${weekNumber}.xlsx`,
            content: base64Content,
        };
        if (shouldSendEmail) {
            const sendEmail = yield (0, notification_1.sendNotification)(`Hodnocení receptů od ${(0, helpers_1.czechDate)(precedingMonday)} do ${(0, helpers_1.czechDate)(lastSunday)}`, recipientEmails, `Hodnocení receptů od ${(0, helpers_1.czechDate)(precedingMonday)} do ${(0, helpers_1.czechDate)(lastSunday)} jsou připravena k exportu`, null, MANDRILL_MESSAGE_BCC_ADDRESS_DEV, attachment, true);
            return res.status(200).json(sendEmail);
        }
        else {
            return res.status(200).json(attachment);
        }
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ error: "Internal server error" });
    }
});
exports.reviews_export = reviews_export;
const client = new graphql_request_1.GraphQLClient(`https://${STORE}/admin/api/${API_VERSION}/graphql.json`, {
    // @ts-ignore
    headers: {
        "X-Shopify-Access-Token": ACCESS_TOKEN,
    },
});
