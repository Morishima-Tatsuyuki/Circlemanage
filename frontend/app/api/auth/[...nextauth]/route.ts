import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import { signBackendJwt } from "@/lib/backendJwt";

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: [
            "openid",
            "email",
            "profile",
          ].join(" "),
        },
      },
    }),
    CredentialsProvider({
      name: "Email",
      credentials: {
        email: { label: "メールアドレス", type: "email" },
        password: { label: "パスワード", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;
        const res = await fetch(`${process.env.BACKEND_URL}/auth/verify`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: credentials.email, password: credentials.password }),
        });
        if (!res.ok) return null;
        const user = await res.json();
        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async jwt({ token, account, user }) {
      if (account?.access_token) {
        token.access_token = account.access_token as string;
      }
      if (user) {
        if (account?.provider === "google") {
          try {
            const res = await fetch(`${process.env.BACKEND_URL}/auth/oauth-upsert`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ email: user.email, name: user.name }),
            });
            if (res.ok) {
              const data = await res.json();
              token.userId = Number(data.id);
            }
          } catch {
            // バックエンド未起動時などはbackendTokenが発行されないだけで、
            // Google側のログイン自体は継続させる
          }
        } else {
          token.userId = Number(user.id);
        }
      }
      return token;
    },
    async session({ session, token }) {
      session.access_token = token.access_token as string | undefined;
      if (token.userId) {
        session.userId = token.userId as number;
        session.backendToken = await signBackendJwt({
          sub: String(token.userId),
          email: session.user?.email ?? undefined,
        });
      }
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };
