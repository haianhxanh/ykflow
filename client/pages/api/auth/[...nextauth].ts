import { URLS } from "@/utils/constants";
import NextAuth, { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 4 * 60 * 60,
  },
  providers: [
    CredentialsProvider({
      type: "credentials",
      credentials: {
        username: {
          label: "Uživatel",
          type: "text",
          placeholder: "yeskrabicky",
        },
        password: {
          label: "Heslo",
          type: "password",
        },
      },
      async authorize(credentials, req) {
        const { username, password } = credentials as {
          username: string;
          password: string;
        };

        if (
          username !== process.env.APP_USERNAME ||
          password !== process.env.APP_PASSWORD
        ) {
          throw new Error("Invalid credentials");
        }
        return {
          username: "yeskrabicky",
        } as any;
      },
    }),
  ],
  pages: {
    signIn: URLS.LOGIN,
  },
  // callbacks: {
  //   jwt(params) {
  //     if (params.user?.role) {
  //       params.token.role == params.user.role;
  //     }
  //     return params.token;
  //   },
  // },
};
export default NextAuth(authOptions);
