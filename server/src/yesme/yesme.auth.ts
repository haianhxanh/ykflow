import { Request, Response, NextFunction } from "express";
import { timingSafeEqual } from "crypto";
import dotenv from "dotenv";

dotenv.config();

const keysMatch = (provided: string, expected: string) => {
  const a = new TextEncoder().encode(provided);
  const b = new TextEncoder().encode(expected);
  return a.length === b.length && timingSafeEqual(a, b);
};

// Accepts `Authorization: Bearer <key>` or a bare `Authorization: <key>` header.
const bearerKeyAuth = (envName: string) => (req: Request, res: Response, next: NextFunction) => {
  try {
    const expected = process.env[envName];
    if (!expected) {
      return res.status(500).json({ message: `${envName} is not configured` });
    }

    const header = String(req.headers.authorization || "");
    const key = header.startsWith("Bearer ") ? header.slice(7) : header;
    if (!keysMatch(key, expected)) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    next();
  } catch (err) {
    return res.status(401).json({ message: "Unauthorized" });
  }
};

export const yesmeStorefrontAuth = bearerKeyAuth("YESME_STOREFRONT_KEY");
export const yesmeExportAuth = bearerKeyAuth("YESME_EXPORT_KEY");
