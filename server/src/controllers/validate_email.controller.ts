import { Request, Response } from "express";
import EasterDiscount from "../model/easterDiscount.model";
import * as emailAddresses from "email-addresses";

export const validateEmail = async (req: Request, res: Response) => {
  const { email } = req.body;
  const easterDiscount = await EasterDiscount.findAll({
    where: {
      email,
    },
  });
  if (easterDiscount.length > 0) {
    return res.status(400).json({
      message: "EMAIL_EXISTS",
      discount: easterDiscount[0].dataValues,
    });
  }
  const isEmailValid = emailAddresses.parseOneAddress(email);
  if (!isEmailValid) {
    return res.status(400).json({
      message: "EMAIL_INVALID",
    });
  }
  return res.status(200).json({
    message: "EMAIL_OK",
  });
};
