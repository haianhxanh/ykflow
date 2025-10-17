import ExcelJS from "exceljs";
import { Request, Response } from "express";
import dotenv from "dotenv";
import { czechDate, getLastSundayAndPrecedingMonday, getWeekNumber, getYesterday } from "../utils/helpers";
import Rating from "../model/rating.model";
import { Op } from "sequelize";
import { meals } from "./meal_rating.controller";
import { sendNotification } from "../utils/notification";
import { GraphQLClient } from "graphql-request";
import { customerQuery } from "../queries/customers";

dotenv.config();
const { ORDER_EXPORT_RECIPIENTS, MANDRILL_MESSAGE_BCC_ADDRESS_DEV } = process.env;
const { ACCESS_TOKEN, STORE, API_VERSION } = process.env;
const recipientEmails = ORDER_EXPORT_RECIPIENTS as string;

/*-------------------------------------MAIN FUNCTION------------------------------------------------*/

export const reviews_export = async (req: Request, res: Response) => {
  try {
    const shouldSendEmail = req.query.sendEmail === "true";
    const { precedingMonday, lastSunday } = getLastSundayAndPrecedingMonday();
    const ratings = (
      await Rating.findAll({
        where: {
          // @ts-ignore
          createdAt: {
            [Op.between]: [`${precedingMonday}T00:00:00.000Z`, `${lastSunday}T23:59:59.999Z`],
          },
        },
      })
    )?.filter((rating) => rating.meal_date >= new Date(precedingMonday) && rating.meal_date <= new Date(lastSunday)) as Rating[];

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
    }, {} as Record<string, Rating[]>);

    const workbook = new ExcelJS.Workbook();

    const worksheet = workbook.addWorksheet(`Všechna hodnocení`);
    worksheet.columns = [
      { header: "Recipe Name", key: "recipe_name", width: 50 },
      { header: "Type", key: "recipe_type", width: 20 },
      { header: "Meal Date", key: "meal_date", width: 10 },
      { header: "Rating", key: "rating", width: 10 },
      { header: "Comment", key: "comment", width: 20 },
      { header: "User", key: "user", width: 40 },
      { header: "User Profile", key: "userProfile", width: 40 },
    ];

    for (let i = 0; i < 5; i++) {
      // @ts-ignore
      const mealType = meals && meals[i]?.name;
      const sortedRecipeTypeRatings = recipeTypeRatings[mealType].sort((a, b) => a.recipe_name.localeCompare(b.recipe_name));
      for (const rating of sortedRecipeTypeRatings) {
        const shopifyUser = rating.shopify_user_id ? await client.request(customerQuery, { id: `gid://shopify/Customer/${rating.shopify_user_id}` }) : null;
        const user = shopifyUser?.customer ? `${shopifyUser.customer.firstName} ${shopifyUser.customer.lastName} (${shopifyUser.customer.email})` : "";
        const userAdminUrl = shopifyUser?.customer ? `https://${STORE}/admin/customers/${rating.shopify_user_id}` : "";
        worksheet.addRow({
          recipe_name: rating.recipe_name,
          recipe_type: rating.recipe_type,
          meal_date: rating.meal_date,
          rating: rating.rating,
          comment: rating.comment,
          user: user,
          userProfile: userAdminUrl,
        });
      }
    }

    const weekNumber = getWeekNumber(precedingMonday);
    await workbook.xlsx.writeFile(`hodnoceni-receptu-tyden-${weekNumber}.xlsx`);
    const buffer = await workbook.xlsx.writeBuffer();
    const base64Content = Buffer.from(buffer).toString("base64");

    const attachment = {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      name: `hodnoceni-receptu-tyden-${weekNumber}.xlsx`,
      content: base64Content,
    };

    if (shouldSendEmail) {
      const sendEmail = await sendNotification(
        `Hodnocení receptů od ${czechDate(precedingMonday)} do ${czechDate(lastSunday)}`,
        recipientEmails,
        `Hodnocení receptů od ${czechDate(precedingMonday)} do ${czechDate(lastSunday)} jsou připravena k exportu`,
        null,
        MANDRILL_MESSAGE_BCC_ADDRESS_DEV as string,
        attachment,
        true
      );
      return res.status(200).json(sendEmail);
    } else {
      return res.status(200).json(attachment);
    }
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
