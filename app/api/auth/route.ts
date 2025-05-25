import { COOKIE_NAME } from "@/constants";
import { ROOT } from "@/constants/root.constant";
import { EStatusCode } from "@/enums";
import { AccountModel } from "@/models";
import { createErrorMessage } from "@/utils/create-error-message";
import { connectToDatabase } from "@/utils/database";
import { decrypt } from "@/utils/decrypt";
import { JWTPayload } from "jose";
import { RequestCookie } from "next/dist/compiled/@edge-runtime/cookies";
import { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const path: string = `${ROOT}/auth/login`;

export const POST = async (): Promise<NextResponse> => {
  // const { action, collectionName } = await req.json();

  try {
    connectToDatabase();

    const cookieStore: ReadonlyRequestCookies = await cookies();

    const token: RequestCookie | undefined = cookieStore.get(COOKIE_NAME);

    if (!token)
      return NextResponse.json(
        createErrorMessage(
          `Unauthorized.`,
          `Cannot find token`,
          path,
          `Please check if token existed.`,
        ),
        { status: EStatusCode.UNAUTHORIZED }
      );

    const { value } = token;
    const payload: JWTPayload | undefined = await decrypt(value);

    if (!payload)
      return NextResponse.json(
        createErrorMessage(
          `Unauthorized.`,
          `Cannot find payload`,
          path,
          `Please check if payload existed.`,
        ),
        { status: EStatusCode.UNAUTHORIZED }
      );

    const account: JWTPayload = { ...payload };
    console.log('Account payload:', account); // Debug để xem thông tin payload

    const foundAccounts = await AccountModel.find({
      username: account.username,
    });

    if (foundAccounts.length === 0)
      return NextResponse.json(
        createErrorMessage(
          `Unauthorized.`,
          `The username or password is incorrect`,
          path,
          `Please check if username or password is corrected.`,
        ),
        { status: EStatusCode.UNAUTHORIZED }
      );

    // Trả về quyền admin dựa vào payload
    const isAccountHadPrivilage = account.is_admin === true;
    console.log('is_admin value:', account.is_admin); // Debug giá trị is_admin
    console.log('isAccountHadPrivilage:', isAccountHadPrivilage); // Debug kết quả cuối cùng

    return NextResponse.json({
      isAccountHadPrivilage: isAccountHadPrivilage
    }, {
      status: EStatusCode.OK,
    });
  } catch (error: unknown) {
    console.error(error);

    return NextResponse.json(
      createErrorMessage(
        `Unauthorized.`,
        error as string,
        path,
        `Please contact for more information.`,
      ),
      { status: EStatusCode.INTERNAL_SERVER_ERROR }
    );
  }
}
