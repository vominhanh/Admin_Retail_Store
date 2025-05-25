import { createErrorMessage } from "@/utils/create-error-message";
import { connectToDatabase } from "@/utils/database";
import { NextRequest, NextResponse } from "next/server";
import { EStatusCode } from "@/enums";
import { UserModel } from "@/models/User";
import { isValidObjectId } from "mongoose";
import { IQueryString } from "@/app/api/interfaces/query-string.interface";

export const GET = async(
  _request: NextRequest,
  query: IQueryString, 
): Promise<NextResponse> => {
  try {
    // Đảm bảo rằng params được await trước khi sử dụng
    const params = await query.params;
    const { id } = params;

    await connectToDatabase();

    if (!isValidObjectId(id)) {
      return NextResponse.json(
        createErrorMessage(
          `Không thể lấy thông tin người dùng.`,
          `ID '${id}' không hợp lệ.`,
          `/api/user/account/${id}`,
          `Vui lòng kiểm tra lại ID người dùng.`,
        ),
        { status: EStatusCode.UNPROCESSABLE_ENTITY }
      );
    }

    const user = await UserModel.findOne({ account_id: id });

    if (!user) {
      return NextResponse.json(
        createErrorMessage(
          `Không thể lấy thông tin người dùng.`,
          `Không tìm thấy người dùng với account_id '${id}'.`,
          `/api/user/account/${id}`,
          `Vui lòng kiểm tra lại ID tài khoản.`,
        ),
        { status: EStatusCode.NOT_FOUND }
      );
    }

    return NextResponse.json(user, { status: EStatusCode.OK });
  } catch (error) {
    // Nếu có lỗi với params, xử lý an toàn
    const params = await query.params;
    const { id } = params;
    console.error('Lỗi khi lấy thông tin người dùng:', error);
    return NextResponse.json(
      createErrorMessage(
        `Không thể lấy thông tin người dùng.`,
        error as string,
        `/api/user/account/${id}`,
        `Vui lòng liên hệ để được hỗ trợ.`,
      ),
      { status: EStatusCode.INTERNAL_SERVER_ERROR }
    );
  }
}
