/* eslint-disable @typescript-eslint/no-unsafe-member-access */
import Credentials from "next-auth/providers/credentials";
import type { NextAuthConfig } from "next-auth";
import { signInSchema } from "@/lib/zod";
import bcrypt from "bcryptjs";
import { db } from "@/server/db";
import type { DefaultSession } from "next-auth";

// TODO: bring back User extension from next-auth

declare module "next-auth" {
  interface Session extends DefaultSession {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

export default {
  providers: [
    Credentials({
      credentials: {
        email: {},
        password: {},
      },
      authorize: async (credentials) => {
        try {
          const parsedCredentials =
            await signInSchema.safeParseAsync(credentials);

          if (!parsedCredentials.success) {
            throw new Error("Neplatné přihlašovací údaje.");
          }

          const { email, password } = parsedCredentials.data;
          const user = await db.user.findUnique({
            where: { email },
          });

          if (!user?.password) {
            throw new Error("Nesprávné přihlašovací údaje.");
          }

          const isValidPassword = await bcrypt.compare(password, user.password);
          if (!isValidPassword) {
            throw new Error("Nesprávné přihlašovací údaje.");
          }
          return {
            id: user.id,
            email: user.email,
          };
        } catch (error) {
          console.error(error);
          return null;
        }
      },
    }),
  ],
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth/login",
  },
  callbacks: {
    async jwt(args) {
      const { token, user } = args;
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session(args) {
      const { session, token } = args;
      if (token && session?.user) {
        session.user.id = token.id as string;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
