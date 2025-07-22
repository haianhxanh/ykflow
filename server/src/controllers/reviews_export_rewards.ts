import ExcelJS from "exceljs";
import { Request, Response } from "express";
import dotenv from "dotenv";
import { getLastSundayAndPrecedingMonday, getWeekNumber, czechDate, getWorkDatesBetweenDates } from "../utils/helpers";
import Rating from "../model/rating.model";
import { Op } from "sequelize";
import { meals } from "./meal_rating.controller";
import { sendNotification } from "../utils/notification";
import { GraphQLClient } from "graphql-request";
import { customerQuery } from "../queries/customers";

dotenv.config();
const { MANDRILL_MESSAGE_BCC_ADDRESS_DEV, REVIEWS_EXPORT_RECIPIENTS, REVIEWS_EXPORT_CC_ADDRESS } = process.env;
const { ACCESS_TOKEN, STORE, API_VERSION } = process.env;
const recipientEmails = [
  {
    email: REVIEWS_EXPORT_RECIPIENTS as string,
    type: "to",
  },
  {
    email: REVIEWS_EXPORT_CC_ADDRESS as string,
    type: "cc",
  },
];

const bccEmail = MANDRILL_MESSAGE_BCC_ADDRESS_DEV as string;

/*-------------------------------------MAIN FUNCTION------------------------------------------------*/

export const reviews_export_rewards = async (req: Request, res: Response) => {
  try {
    let { precedingMonday, lastSunday } = getLastSundayAndPrecedingMonday();
    // precedingMonday = "2025-06-30";
    // lastSunday = "2025-07-06";
    const ratings = (await Rating.findAll({
      where: {
        // @ts-ignore
        meal_date: {
          [Op.between]: [`${precedingMonday}T00:00:00.000Z`, `${lastSunday}T23:59:59.999Z`],
        },
      },
    })) as Rating[];

    if (!ratings) {
      return res.status(404).json({ error: "No ratings found" });
    }

    const workDays = getWorkDatesBetweenDates(precedingMonday, lastSunday);

    // filter out ratings without shopify_user_id
    const filteredRatings = ratings.filter((rating) => rating.shopify_user_id && rating.meal_date);

    // group by users
    const users = filteredRatings.reduce((acc: Record<number, Rating[]>, rating: Rating) => {
      if (!acc[rating.shopify_user_id]) {
        acc[rating.shopify_user_id] = [];
      }
      acc[rating.shopify_user_id].push(rating);
      return acc;
    }, {} as Record<number, Rating[]>);

    const workbook = new ExcelJS.Workbook();

    const worksheet = workbook.addWorksheet(`Odměny`);

    // Define all columns upfront instead of dynamically pushing
    const columns = [
      { header: "Email", key: "email", width: 20 },
      { header: "Profil", key: "profile", width: 20 },
    ];

    // Add day columns
    for (const [index, date] of workDays.entries()) {
      columns.push({ header: `${czechDate(date)}`, key: `day_${index + 1}`, width: 20 });
    }

    // Add total columns
    columns.push({ header: "Počet hodnocení", key: "total_ratings", width: 20 });
    columns.push({ header: "Počet bodů", key: "total_points", width: 20 });

    // Set all columns at once
    worksheet.columns = columns;

    for (const [index, userRatings] of Object.entries(users)) {
      const ratings = userRatings as Rating[];
      const shopifyUser = ratings[0]?.shopify_user_id
        ? await client.request(customerQuery, { id: `gid://shopify/Customer/${ratings[0].shopify_user_id}` })
        : null;
      const userName = shopifyUser?.customer ? `${shopifyUser.customer.firstName} ${shopifyUser.customer.lastName} (${shopifyUser.customer.email})` : "";
      const userAdminUrl = shopifyUser?.customer ? `https://${STORE}/admin/customers/${ratings[0].shopify_user_id}` : "";
      const dayRatings = [];
      let totalRatings = 0;

      for (const [index, date] of workDays.entries()) {
        dayRatings.push(ratings.filter((rating) => rating.meal_date?.toISOString().split("T")[0] == date).length);
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

    const weekNumber = getWeekNumber(precedingMonday);
    await workbook.xlsx.writeFile(`odmeny-za-hodnoceni-tyden-${weekNumber}.xlsx`);
    const buffer = await workbook.xlsx.writeBuffer();
    const base64Content = Buffer.from(buffer).toString("base64");

    let attachment = {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      name: `odmeny-za-hodnoceni-tyden-${weekNumber}.xlsx`,
      content: base64Content,
    };

    const sendEmail = await sendNotification(
      `Odměny za hodnocení receptů od ${czechDate(precedingMonday)} do ${czechDate(lastSunday)}`,
      recipientEmails,
      `Je připraven export odměn za hodnocení receptů od ${czechDate(precedingMonday)} do ${czechDate(lastSunday)}`,
      null,
      bccEmail,
      attachment,
      true
    );

    return res.status(200).json(sendEmail);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Internal server error" });
  }
};

const client = new GraphQLClient(`https://${STORE}/admin/api/${API_VERSION}/graphql.json`, {
  // @ts-ignore
  headers: {
    "X-Shopify-Access-Token": ACCESS_TOKEN,
  },
});
