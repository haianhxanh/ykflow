import { Request, Response, NextFunction } from "express";
import { createHmac, timingSafeEqual } from "crypto";
import dotenv from "dotenv";

dotenv.config();

const keysMatch = (provided: string, expected: string) => {
  const a = new TextEncoder().encode(provided);
  const b = new TextEncoder().encode(expected);
  return a.length === b.length && timingSafeEqual(a, b);
};

// Accepts `Authorization: Bearer <key>` or a bare `Authorization: <key>` header.
const bearerToken = (req: Request) => {
  const header = String(req.headers.authorization || "");
  return header.startsWith("Bearer ") ? header.slice(7) : header;
};

const bearerKeyAuth = (envName: string) => (req: Request, res: Response, next: NextFunction) => {
  try {
    const expected = process.env[envName];
    if (!expected) {
      return res.status(500).json({ message: `${envName} is not configured` });
    }

    if (!keysMatch(bearerToken(req), expected)) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    next();
  } catch (err) {
    return res.status(401).json({ message: "Unauthorized" });
  }
};

const base64UrlJson = (part: string) => JSON.parse(Buffer.from(part, "base64url").toString("utf8"));

// Verifies a Shopify session token (HS256 JWT signed with the app's client secret) issued by the
// yesme-b2b-management admin app for the Yes Me store.
const isValidAdminSessionToken = (token: string) => {
  const { YESME_APP_CLIENT_ID, YESME_APP_CLIENT_SECRET, YESME_STORE } = process.env;
  if (!YESME_APP_CLIENT_ID || !YESME_APP_CLIENT_SECRET || !YESME_STORE) return false;

  const [header, payload, signature] = token.split(".");
  if (!header || !payload || !signature) return false;
  if (base64UrlJson(header)?.alg !== "HS256") return false;

  const expectedSignature = createHmac("sha256", YESME_APP_CLIENT_SECRET).update(`${header}.${payload}`).digest("base64url");
  if (!keysMatch(signature, expectedSignature)) return false;

  const claims = base64UrlJson(payload);
  const now = Math.floor(Date.now() / 1000);
  const leeway = 10;
  if (typeof claims?.exp !== "number" || claims.exp + leeway < now) return false;
  if (typeof claims?.nbf === "number" && claims.nbf - leeway > now) return false;
  if (claims?.aud !== YESME_APP_CLIENT_ID) return false;
  return claims?.dest === `https://${YESME_STORE}`;
};

export const yesmeStorefrontAuth = bearerKeyAuth("YESME_STOREFRONT_KEY");
export const yesmeExportAuth = bearerKeyAuth("YESME_EXPORT_KEY");

// Export endpoints are called both by the scheduled job (YESME_EXPORT_KEY) and by the admin app
// buttons (Shopify session token).
export const yesmeExportOrAdminAuth = (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = bearerToken(req);
    const exportKey = process.env.YESME_EXPORT_KEY;
    if ((exportKey && keysMatch(token, exportKey)) || isValidAdminSessionToken(token)) {
      return next();
    }
    return res.status(401).json({ message: "Unauthorized" });
  } catch (err) {
    return res.status(401).json({ message: "Unauthorized" });
  }
};
