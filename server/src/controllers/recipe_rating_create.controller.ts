import { Request, Response } from "express";
import dotenv from "dotenv";
import Recipe from "../model/recipe.model";
import Rating from "../model/rating.model";
dotenv.config();

type RecipeObj = {
  id: number;
  name: string;
  type: string;
};
export const recipe_rating_create = async (req: Request, res: Response) => {
  let recipe = {} as RecipeObj;
  await Recipe.findOrCreate({
    where: { name: req.body.recipe_name, type: req.body.recipe_type },
  }).then(([recipeRow, isCreated]: [Recipe, boolean]) => {
    recipe = recipeRow;
  });

  const rating = await Rating.create(
    {
      rating: req.body.rating,
      recipe_id: recipe.id,
      recipe_name: recipe.name,
      recipe_type: recipe.type,
      shopify_user_id: req.body?.shopify_user_id || null,
      comment: req.body?.comment || null,
      meal_date: req.body?.meal_date || null,
      keep_menu: req.body?.keep_menu != null ? (req.body?.keep_menu ? true : false) : null,
      keep_menu_note: req.body?.keep_menu_note || null,
    },
    { returning: true },
  );
  console.log("New rating with comment", rating?.dataValues);
  return res.status(200).json(rating);
};
