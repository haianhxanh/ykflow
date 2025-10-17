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
exports.reviews_export_rewards = void 0;
const exceljs_1 = __importDefault(require("exceljs"));
const dotenv_1 = __importDefault(require("dotenv"));
const helpers_1 = require("../utils/helpers");
const rating_model_1 = __importDefault(require("../model/rating.model"));
const sequelize_1 = require("sequelize");
const notification_1 = require("../utils/notification");
const graphql_request_1 = require("graphql-request");
const customers_1 = require("../queries/customers");
dotenv_1.default.config();
const { MANDRILL_MESSAGE_BCC_ADDRESS_DEV, REVIEWS_EXPORT_RECIPIENTS } = process.env;
const { ACCESS_TOKEN, STORE, API_VERSION } = process.env;
const recipientEmails = REVIEWS_EXPORT_RECIPIENTS === null || REVIEWS_EXPORT_RECIPIENTS === void 0 ? void 0 : REVIEWS_EXPORT_RECIPIENTS.split(",").map((email) => ({ email, type: "to" }));
const bccEmail = MANDRILL_MESSAGE_BCC_ADDRESS_DEV;
/*-------------------------------------MAIN FUNCTION------------------------------------------------*/
const reviews_export_rewards = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        let { precedingMonday, lastSunday } = (0, helpers_1.getLastSundayAndPrecedingMonday)();
        const shouldSendEmail = req.query.sendEmail === "true";
        const ratings = (yield rating_model_1.default.findAll({
            where: {
                // @ts-ignore
                meal_date: {
                    [sequelize_1.Op.between]: [`${precedingMonday}T00:00:00.000Z`, `${lastSunday}T23:59:59.999Z`],
                },
            },
        }));
        if (!ratings) {
            return res.status(404).json({ error: "No ratings found" });
        }
        const workDays = (0, helpers_1.getWorkDatesBetweenDates)(precedingMonday, lastSunday);
        // filter out ratings without shopify_user_id
        const filteredRatings = ratings.filter((rating) => rating.shopify_user_id && rating.meal_date && rating.meal_date >= new Date(precedingMonday) && rating.meal_date <= new Date(lastSunday));
        // group by users
        const users = filteredRatings.reduce((acc, rating) => {
            if (!acc[rating.shopify_user_id]) {
                acc[rating.shopify_user_id] = [];
            }
            acc[rating.shopify_user_id].push(rating);
            return acc;
        }, {});
        const workbook = new exceljs_1.default.Workbook();
        const worksheet = workbook.addWorksheet(`Odměny`);
        // Define all columns upfront instead of dynamically pushing
        const columns = [
            { header: "Email", key: "email", width: 20 },
            { header: "Profil", key: "profile", width: 20 },
        ];
        // Add day columns
        for (const [index, date] of workDays.entries()) {
            columns.push({ header: `${(0, helpers_1.czechDate)(date)}`, key: `day_${index + 1}`, width: 20 });
        }
        // Add total columns
        columns.push({ header: "Počet hodnocení", key: "total_ratings", width: 20 });
        columns.push({ header: "Počet bodů", key: "total_points", width: 20 });
        // Set all columns at once
        worksheet.columns = columns;
        for (const [index, userRatings] of Object.entries(users)) {
            const ratings = userRatings;
            const shopifyUser = ((_a = ratings[0]) === null || _a === void 0 ? void 0 : _a.shopify_user_id)
                ? yield client.request(customers_1.customerQuery, { id: `gid://shopify/Customer/${ratings[0].shopify_user_id}` })
                : null;
            const userName = (shopifyUser === null || shopifyUser === void 0 ? void 0 : shopifyUser.customer) ? `${shopifyUser.customer.firstName} ${shopifyUser.customer.lastName} (${shopifyUser.customer.email})` : "";
            const userAdminUrl = (shopifyUser === null || shopifyUser === void 0 ? void 0 : shopifyUser.customer) ? `https://${STORE}/admin/customers/${ratings[0].shopify_user_id}` : "";
            const dayRatings = [];
            let totalRatings = 0;
            for (const [index, date] of workDays.entries()) {
                dayRatings.push(ratings.filter((rating) => { var _a; return ((_a = rating.meal_date) === null || _a === void 0 ? void 0 : _a.toISOString().split("T")[0]) == date; }).length);
                totalRatings += dayRatings[index] || 0;
            }
            worksheet.addRow({
                email: userName,
                profile: userAdminUrl,
                day_1: dayRatings[0],
                day_2: dayRatings[1],
                day_3: dayRatings[2],
                day_4: dayRatings[3],
                day_5: dayRatings[4],
                total_ratings: totalRatings,
                total_points: totalRatings * 500,
            });
        }
        const weekNumber = (0, helpers_1.getWeekNumber)(precedingMonday);
        yield workbook.xlsx.writeFile(`odmeny-za-hodnoceni-tyden-${weekNumber}.xlsx`);
        const buffer = yield workbook.xlsx.writeBuffer();
        const base64Content = Buffer.from(buffer).toString("base64");
        let attachment = {
            type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            name: `odmeny-za-hodnoceni-tyden-${weekNumber}.xlsx`,
            content: base64Content,
        };
        if (shouldSendEmail) {
            const sendEmail = yield (0, notification_1.sendNotification)(`Odměny za hodnocení receptů od ${(0, helpers_1.czechDate)(precedingMonday)} do ${(0, helpers_1.czechDate)(lastSunday)}`, recipientEmails, `Je připraven export odměn za hodnocení receptů od ${(0, helpers_1.czechDate)(precedingMonday)} do ${(0, helpers_1.czechDate)(lastSunday)}`, null, bccEmail, attachment, true);
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
exports.reviews_export_rewards = reviews_export_rewards;
const client = new graphql_request_1.GraphQLClient(`https://${STORE}/admin/api/${API_VERSION}/graphql.json`, {
    // @ts-ignore
    headers: {
        "X-Shopify-Access-Token": ACCESS_TOKEN,
    },
});
