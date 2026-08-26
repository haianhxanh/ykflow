import { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";

dotenv.config();

export const yesmeStorefrontAuth = (req: Request, res: Response, next: NextFunction) => {
  try {
    const expected = process.env.YESME_STOREFRONT_KEY;
    if (!expected) {
      return res.status(500).json({ message: "YESME_STOREFRONT_KEY is not configured" });
    }

    const header = String(req.headers.authorization || "");
    const key = header.startsWith("Bearer ") ? header.slice(7) : header;
    if (key !== expected) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    next();
  } catch (err) {
    return res.status(401).json({ message: "Unauthorized" });
  }
};
