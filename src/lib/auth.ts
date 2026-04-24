import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

// We do NOT use PrismaAdapter because it's incompatible with CredentialsProvider
// in NextAuth v4 under JWT strategy. We handle user creation ourselves in authorize().

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID ?? "",
      clientSecret: process.env.AUTH_GOOGLE_SECRET ?? "",
    }),
    // Email + password login (production)
    CredentialsProvider({
      id: "credentials-password",
      name: "Email y Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const email = credentials.email.trim().toLowerCase();

        try {
          const user = await prisma.user.findUnique({
            where: { email },
            select: {
              id: true,
              email: true,
              name: true,
              image: true,
              passwordHash: true,
            },
          });

          if (!user || !user.passwordHash) return null;

          const valid = await bcrypt.compare(
            credentials.password,
            user.passwordHash
          );
          if (!valid) return null;

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            image: user.image,
          };
        } catch (error) {
          console.error("Password login error:", error);
          return null;
        }
      },
    }),
    // Dev-only: login by email only (no password) for testing
    ...(process.env.NODE_ENV === "development"
      ? [
          CredentialsProvider({
            id: "credentials",
            name: "Dev Login",
            credentials: {
              email: { label: "Email", type: "email" },
            },
            async authorize(credentials) {
              if (!credentials?.email) return null;
              try {
                const user = await prisma.user.upsert({
                  where: { email: credentials.email },
                  update: {},
                  create: {
                    email: credentials.email,
                    name: credentials.email.split("@")[0],
                  },
                });
                return {
                  id: user.id,
                  email: user.email,
                  name: user.name,
                  image: user.image,
                };
              } catch (error) {
                console.error("Dev login error:", error);
                return null;
              }
            },
          }),
        ]
      : []),
  ],
  callbacks: {
    async signIn({ user, account }) {
      // Auto-create user on first Google login (since we don't use PrismaAdapter)
      if (account?.provider === "google" && user.email) {
        const email = user.email.toLowerCase();
        await prisma.user.upsert({
          where: { email },
          update: {
            name: user.name ?? undefined,
            image: user.image ?? undefined,
          },
          create: {
            email,
            name: user.name ?? email.split("@")[0],
            image: user.image ?? undefined,
          },
        });
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      // Fetch role, nickname, credits from DB
      if (token.email) {
        const dbUser = await prisma.user.findUnique({
          where: { email: token.email },
          select: { id: true, role: true, nickname: true, credits: true },
        });
        if (dbUser) {
          token.id = dbUser.id;
          token.role = dbUser.role;
          token.nickname = dbUser.nickname;
          token.credits = dbUser.credits;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.nickname = (token.nickname as string) ?? null;
        session.user.credits = (token.credits as number) ?? 0;
      }
      return session;
    },
  },
};
