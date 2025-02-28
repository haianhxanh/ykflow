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
exports.recipe_rating_create = void 0;
const dotenv_1 = __importDefault(require("dotenv"));
const recipe_model_1 = __importDefault(require("../model/recipe.model"));
const rating_model_1 = __importDefault(require("../model/rating.model"));
dotenv_1.default.config();
const recipe_rating_create = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b;
    let recipe = {};
    yield recipe_model_1.default.findOrCreate({
        where: { name: req.body.recipe_name, type: req.body.recipe_type },
    }).then(([recipeRow, isCreated]) => {
        recipe = recipeRow;
    });
    const rating = yield rating_model_1.default.create({
        rating: req.body.rating,
        recipe_id: recipe.id,
        recipe_name: recipe.name,
        recipe_type: recipe.type,
        shopify_user_id: ((_a = req.body) === null || _a === void 0 ? void 0 : _a.shopify_user_id) || null,
        comment: ((_b = req.body) === null || _b === void 0 ? void 0 : _b.comment) || null,
    }, { returning: true });
    console.log("New rating with comment", rating === null || rating === void 0 ? void 0 : rating.dataValues);
    return res.status(200).json(rating);
});
exports.recipe_rating_create = recipe_rating_create;
