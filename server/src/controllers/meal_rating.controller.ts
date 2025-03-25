import { Request, Response } from "express";
import { GraphQLClient } from "graphql-request";
import dotenv from "dotenv";
import { metaobjectsQuery, metaobjectUpdateMutation } from "../queries/metafields";
dotenv.config();
const { ACCESS_TOKEN, STORE, API_VERSION } = process.env;
export const meal_rating = async (req: Request, res: Response) => {
  try {
    const week = req.body.week;
    const day = req.body.day as keyof typeof days;
    const mealIndex = req.body.mealIndex as keyof typeof meals;
    const rating = req.body.rating;

    console.log(`New rating for ${week}, ${days[day].name}, ${meals[mealIndex].name}: ${rating}`);

    const client = new GraphQLClient(`https://${STORE}/admin/api/${API_VERSION}/graphql.json`, {
      // @ts-ignore
      headers: {
        "X-Shopify-Access-Token": ACCESS_TOKEN,
      },
    });

    const meta = await client.request(metaobjectsQuery, {
      query: `handle=${week}`,
      type: "week",
    });

    if (!meta.metaobjects.edges.length) {
      return res.status(404).json({ message: `Week ${week} not found` });
    }

    const dayRatingKey = `${days[day].name}_rating`;
    const mealName = meals[mealIndex].name;
    const ratingOfTheDay = meta.metaobjects.edges[0].node.fields.find((field: any) => field.key == dayRatingKey);
    let ratingOfTheDayValue;

    if (!ratingOfTheDay || !ratingOfTheDay.value) {
      ratingOfTheDayValue = {
        [mealName]: {
          rating_count: 1,
          rating_average: parseFloat(rating).toFixed(1),
        },
      };
    } else {
      ratingOfTheDayValue = JSON.parse(ratingOfTheDay.value);
      if (!ratingOfTheDayValue[mealName]) {
        ratingOfTheDayValue[mealName] = {
          rating_count: 1,
          rating_average: parseFloat(rating).toFixed(1),
        };
      } else {
        const oldRatingCount = ratingOfTheDayValue[mealName].rating_count;
        const newRatingCount = ratingOfTheDayValue[mealName].rating_count + 1;
        ratingOfTheDayValue[mealName].rating_count = newRatingCount;
        const newRatingAverage = (parseFloat(ratingOfTheDayValue[mealName].rating_average) * oldRatingCount + parseFloat(rating)) / newRatingCount;
        ratingOfTheDayValue[mealName].rating_average = newRatingAverage.toFixed(1);
      }
    }

    const updatedMetaobject = client.request(metaobjectUpdateMutation, {
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
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

export const meals = {
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
