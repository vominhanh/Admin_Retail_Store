import { createErrorMessage } from "@/utils/create-error-message";
import { NextRequest, NextResponse } from "next/server";
import { serialize } from "cookie";
import { EStatusCode } from "@/enums";
import { COOKIE_MAX_AGE, COOKIE_NAME } from "@/constants";
import { encrypt } from "@/utils/encrypt";
import { AccountModel } from "@/models";
import { IAccountPayload } from "../../interfaces/account-payload.interface";
import { ROOT } from "@/constants/root.constant";
import { connectToDatabase } from "@/utils/database";

const path: string = `${ROOT}/auth/login`;

export const POST = async (req: NextRequest): Promise<NextResponse> => {
  const { username, password } = await req.json();

  await connectToDatabase();

  const foundAccounts = await AccountModel.find({
    username: username,
  });

  if (foundAccounts.length === 0)
    return NextResponse.json(
      createErrorMessage(
        `Failed to login.`,
        `The username or password is incorrect`,
        path,
        `Please check if username or password is corrected.`,
      ),
      { status: EStatusCode.UNAUTHORIZED }
    );

  const isPasswordMatch: boolean =
    await foundAccounts[0].comparePassword(password);

  if (!isPasswordMatch)
    return NextResponse.json(
      createErrorMessage(
        `Failed to login.`,
        `The password is incorrect`,
        path,
        `Please check if username or password is corrected.`,
      ),
      { status: EStatusCode.UNAUTHORIZED }
    );

  // if ( username !== `admin` || password !== `admin` ) 
  //   return NextResponse.json(
  //     createErrorMessage(
  //       `Failed to login as admin.`,
  //       `The username or password is incorrect`,
  //       path, 
  //       `Please check if username or password is corrected.`, 
  //     ),
  //     { status: EStatusCode.UNAUTHORIZED }
  //   );

  const accountPayload: IAccountPayload = {
    _id: foundAccounts[0]._id.toString(),
    username: foundAccounts[0].username,
    is_admin: foundAccounts[0].is_admin,
  }

  const payload: string = await encrypt({ ...accountPayload });
  const cookie: string = serialize(COOKIE_NAME, payload, {
    httpOnly: true,
    sameSite: `strict`,
    maxAge: COOKIE_MAX_AGE,
    path: `/`,
  });

  return NextResponse.json({
    message: `Authenticated!`,
    cookie: cookie
  }, {
    status: EStatusCode.OK,
    headers: {
      "Set-Cookie": cookie,
    }
  });
}
