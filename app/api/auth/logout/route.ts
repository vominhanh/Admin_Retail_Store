import { EStatusCode } from "@/enums/status-code.enum";
import { NextResponse } from "next/server";
import { serialize } from "cookie";
import { COOKIE_NAME } from "@/constants";

export const GET = async (): Promise<NextResponse> => {
  const cookie: string = serialize(COOKIE_NAME, ``, {
    httpOnly: true, 
    sameSite: `strict`, 
    maxAge: -1, 
    path: `/`, 
  });

  return NextResponse.json({
    message: `Log Out!`
  }, { 
    status: EStatusCode.OK, 
    headers:{
      "Set-Cookie": cookie, 
    }
  });
}
