import { COOKIE_MAX_AGE } from "@/constants";
import { JWTPayload, SignJWT } from "jose";

export const encrypt = async (payload: JWTPayload): Promise<string> => {
  const secret = process.env.JWT_SECRET || ``;
  const key: Uint8Array<ArrayBufferLike> = new TextEncoder().encode(secret);

  return await new SignJWT(payload)
    .setProtectedHeader({alg: `HS256`})
    .setIssuedAt()
    .setExpirationTime(`${COOKIE_MAX_AGE} second`)
    .sign(key)
}
