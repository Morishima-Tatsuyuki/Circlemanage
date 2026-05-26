import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";

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
            "https://www.googleapis.com/auth/calendar",
            "https://www.googleapis.com/auth/forms.body",
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
    async jwt({ token, account }) {
      if (account?.access_token) {
        token.access_token = account.access_token as string;
      }
      return token;
    },
    async session({ session, token }) {
      session.access_token = token.access_token as string | undefined;
      return session;
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
});

export { handler as GET, handler as POST };
