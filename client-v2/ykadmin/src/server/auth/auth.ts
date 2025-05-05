import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { PrismaClient } from "@prisma/client";
import authConfig from "./auth.config";

const prisma = new PrismaClient();

// The 2 config files strategy is needed due to Prisma causing trouble with middleware
export const { auth, handlers, signIn, signOut } = NextAuth({
  // eslint-disable-next-line @typescript-eslint/consistent-type-imports, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
  adapter: PrismaAdapter(prisma) as any, // TODO: fix this
  ...authConfig,
});
