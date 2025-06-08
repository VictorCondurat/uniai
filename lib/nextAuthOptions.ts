import GoogleProvider from "next-auth/providers/google"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import type { NextAuthOptions } from "next-auth"
import { compare } from "bcryptjs"

export const authOptions: NextAuthOptions = {
    adapter: PrismaAdapter(prisma),
    session: {
        strategy: "jwt",
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID!,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
            allowDangerousEmailAccountLinking: true,
            profile(profile) {
                return {
                    id: profile.sub,
                    name: profile.name,
                    email: profile.email,
                    image: profile.picture,
                    role: "user",
                    verified: true,
                };
            },
        }),
        CredentialsProvider({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" }
            },
            async authorize(credentials) {
                if (!credentials?.email || !credentials?.password) {
                    throw new Error("Email and password are required");
                }
                const user = await prisma.user.findUnique({
                    where: { email: credentials.email }
                });

                if (!user || !user.password) {
                    throw new Error("Invalid email or password");
                }

                const isPasswordValid = await compare(credentials.password, user.password);

                if (!isPasswordValid) {
                    throw new Error("Invalid email or password");
                }

                if (!user.verified) {
                    throw new Error("Please verify your email before signing in");
                }

                return {
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    image: user.image,
                    role: user.role
                };
            }
        })
    ],
    callbacks: {
        async signIn({ user, account, profile }) {
            if (account?.provider === "credentials") {
                return true;
            }

            if (account?.provider === "google" && user.email) {
                let existingUser = await prisma.user.findUnique({
                    where: { email: user.email },
                });

                if (!existingUser) {
                    existingUser = await prisma.user.create({
                        data: {
                            email: user.email,
                            name: user.name,
                            image: user.image,
                            verified: true,
                            role: "user",
                        },
                    });
                } else if (!existingUser.verified) {
                    await prisma.user.update({
                        where: { id: existingUser.id },
                        data: { verified: true },
                    });
                }

                const linkedAccount = await prisma.account.findFirst({
                    where: {
                        userId: existingUser.id,
                        provider: "google",
                    }
                });

                if (!linkedAccount && account) {
                    await prisma.account.create({
                        data: {
                            userId: existingUser.id,
                            type: account.type,
                            provider: account.provider,
                            providerAccountId: account.providerAccountId,
                            access_token: account.access_token,
                            expires_at: account.expires_at,
                            token_type: account.token_type,
                            scope: account.scope,
                            id_token: account.id_token,
                        },
                    });
                }

                user.id = existingUser.id;
                (user as any).role = existingUser.role;
            }

            return true;
        },
        async jwt({ token, user, account, trigger }) {
            if (account && user) {
                if (account.provider === "google") {
                    const dbUser = await prisma.user.findUnique({
                        where: { email: user.email! },
                        select: { id: true, role: true, email: true }
                    });

                    if (dbUser) {
                        token.userId = dbUser.id;
                        token.email = dbUser.email;
                        token.role = dbUser.role;
                    }
                } else {
                    token.userId = user.id;
                    token.email = user.email;
                    token.role = (user as any).role || "user";
                }
            }

            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.userId as string;
                session.user.role = token.role as string;
            }
            return session;
        },
    },
    pages: {
        signIn: "/login",
        newUser: "/dashboard",
        error: "/login",
    },
    debug: process.env.NODE_ENV === "development",
};

