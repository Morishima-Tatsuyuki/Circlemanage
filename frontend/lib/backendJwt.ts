import { SignJWT } from "jose";

const secret = new TextEncoder().encode(process.env.BACKEND_JWT_SECRET || "");

export async function signBackendJwt(payload: { sub: string; email?: string }): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("30m")
    .sign(secret);
}
