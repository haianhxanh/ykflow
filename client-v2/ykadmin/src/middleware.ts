import authConfig from "@/server/auth/auth.config";
import NextAuth from "next-auth";
import { type NextRequest, NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    pathname.startsWith("/_next") || // Next.js assets
    pathname.startsWith("/api") || // API endpoints
    pathname.startsWith("/public") || // Public assets (not needed but for safety)
    pathname.startsWith("/images") || // Image assets
    pathname.startsWith("/favicon.ico") // Favicon
  ) {
    return NextResponse.next();
  }

  const session = await auth();

  console.log("Middleware auth check:", { pathname, session });

  // Redirect authenticated users *away* from `/auth` pages
  if (pathname.startsWith("/auth") && session) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  // Redirect unauthenticated users to `/auth/login`
  if (!session && !pathname.startsWith("/auth")) {
    return NextResponse.redirect(new URL("/auth/login", req.url));
  }

  return NextResponse.next();
}
