import { JWTPayload, jwtVerify, JWTVerifyResult } from "jose";

export const decrypt = async (
  input: string
): Promise<JWTPayload | undefined> => {
  const secret = process.env.JWT_SECRET || ``;
  const key: Uint8Array<ArrayBufferLike> = new TextEncoder().encode(secret);

  try {
    const { payload }: JWTVerifyResult<JWTPayload> = await jwtVerify(
      input, 
      key, 
      { algorithms: [`HS256`], }
    );
    return payload;
  } catch (error: unknown) {
    console.error(`Error decrypt input`, error);
    return undefined;
  }
}
