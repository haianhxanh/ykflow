import EasterDiscount from "../model/easterDiscount.model";
import { Request, Response } from "express";
import { GraphQLClient } from "graphql-request";
import dotenv from "dotenv";
import { createDiscountCodeMutation } from "../queries/discounts";
import { sendNotification } from "../utils/notification";
import { easterHtmlContent } from "../utils/easterEmailContent";
dotenv.config();

const { ACCESS_TOKEN, STORE, API_VERSION, MANDRILL_MESSAGE_BCC_ADDRESS_DEV, COLLECTION_PROGRAMS_ID } = process.env;

const discountRules = [
  {
    discount_type: "a",
    discount_percentage: 70,
    discount_limit: 1,
  },
  {
    discount_type: "b",
    discount_percentage: 35,
    discount_limit: 3,
  },
  {
    discount_type: "c",
    discount_percentage: 20,
    discount_limit: 10,
  },
  {
    discount_type: "d",
    discount_percentage: 15,
    discount_limit: 10,
  },
];

export const getEasterDiscount = async (req: Request, res: Response) => {
  const { email } = req.body;
  const randomDiscount = getRandomDiscount();
  const selectedDiscount = await EasterDiscount.findAll({
    where: {
      discount_type: randomDiscount.discount_type,
    },
  });

  const finalDiscount = {
    discount_type: selectedDiscount.length < randomDiscount.discount_limit ? randomDiscount.discount_type : "default",
    discount_percentage: selectedDiscount.length < randomDiscount.discount_limit ? randomDiscount.discount_percentage : 10,
  };

  let code = generateDiscountCode(finalDiscount.discount_percentage);
  let isCodeUnique = false;
  while (!isCodeUnique) {
    const existingDiscount = await EasterDiscount.findAll({ where: { discount_code: code } });
    if (existingDiscount.length === 0) {
      isCodeUnique = true;
    } else {
      code = generateDiscountCode(finalDiscount.discount_percentage);
    }
  }

  const shopifyDiscount = await createNewShopifyDiscount(finalDiscount.discount_percentage, email, code);
  if (shopifyDiscount.discountCodeBasicCreate.userErrors.length > 0) {
    return res.status(400).json({
      message: shopifyDiscount.discountCodeBasicCreate.userErrors[0].message,
      error: true,
    });
  }

  const newDiscount = await EasterDiscount.create({
    discount_type: finalDiscount.discount_type,
    discount_percentage: finalDiscount.discount_percentage,
    discount_code: code,
    email: email,
  });

  // Send email to customer
  const emailContent = easterHtmlContent(code, finalDiscount.discount_percentage);

  const sendEmail = await sendNotification("Velikonoční nadílka právě dorazila!", email, emailContent, MANDRILL_MESSAGE_BCC_ADDRESS_DEV as string, null, false);

  return res.status(200).json({
    shopifyDiscount: shopifyDiscount,
    discount: newDiscount.dataValues,
    email: sendEmail,
  });
};

const createNewShopifyDiscount = async (percentage: number, email: string, code: string) => {
  const client = new GraphQLClient(`https://${STORE}/admin/api/${API_VERSION}/graphql.json`, {
    // @ts-ignore
    headers: {
      "X-Shopify-Access-Token": ACCESS_TOKEN,
    },
  });

  const discountCode = await client.request(createDiscountCodeMutation, {
    basicCodeDiscount: {
      title: code,
      code: code,
      customerSelection: {
        all: true,
      },
      customerGets: {
        value: {
          percentage: percentage / 100,
        },
        items: {
          collections: {
            add: [`gid://shopify/Collection/${COLLECTION_PROGRAMS_ID}`],
          },
        },
      },
      startsAt: new Date().toISOString(),
      usageLimit: 1,
      appliesOncePerCustomer: true,
    },
  });

  return discountCode;
};

const generateDiscountCode = (percentage: number) => {
  const consonants = generateConsonants();
  const code = `EASTER${percentage}${consonants}`;
  return code;
};

const generateConsonants = () => {
  const consonants = "bcdfghjklmnpqrstvwxyz";
  const randomConsonants =
    consonants[Math.floor(Math.random() * consonants.length)] +
    consonants[Math.floor(Math.random() * consonants.length)] +
    consonants[Math.floor(Math.random() * consonants.length)] +
    consonants[Math.floor(Math.random() * consonants.length)];
  return randomConsonants.toUpperCase();
};

const getRandomDiscount = () => {
  const randomIndex = Math.floor(Math.random() * discountRules.length);
  return discountRules[randomIndex];
};
