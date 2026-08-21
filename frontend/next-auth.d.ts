import "next-auth";

declare module "next-auth" {
  interface Session {
    access_token?: string;
    error?: string;
    backendToken?: string;
    userId?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    access_token?: string;
    refresh_token?: string;
    expires_at?: number;
    error?: string;
    userId?: number;
  }
}
