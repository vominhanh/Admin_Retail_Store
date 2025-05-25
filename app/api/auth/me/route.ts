import { COOKIE_NAME } from "@/constants";
import { EStatusCode } from "@/enums";
import { decrypt } from "@/utils/decrypt";
import { RequestCookie } from "next/dist/compiled/@edge-runtime/cookies";
import { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";
import { cookies } from "next/headers"
import { NextResponse } from "next/server";

export const GET = async (): Promise<NextResponse> => {
  const cookieStore: ReadonlyRequestCookies = await cookies();
  const token: RequestCookie | undefined = cookieStore.get(COOKIE_NAME);

  if (!token)
    return NextResponse.json({
      message: `Unauthorized!`
    }, {
      status: EStatusCode.UNAUTHORIZED,
    });

  const { value } = token;

  try {
    const user = await decrypt(value);

    if (!user)
      return NextResponse.json({
        message: `Unauthorized!`
      }, {
        status: EStatusCode.UNAUTHORIZED,
      });

    return NextResponse.json(user, {
      status: EStatusCode.OK,
    });
  } catch (error) {
    return NextResponse.json({
      message: error,
    }, {
      status: EStatusCode.INTERNAL_SERVER_ERROR,
    });
  }
}
