import { createErrorMessage } from "@/utils/create-error-message";
import { NextRequest, NextResponse } from "next/server";
import { AccountModel } from "@/models";
import { EStatusCode } from "@/enums";
import { ECollectionNames } from "@/enums/collection-names.enum";
import { ROOT } from "@/constants/root.constant";
import { connectToDatabase } from "@/utils/database";
import bcrypt from 'bcrypt';

const collectionName: ECollectionNames = ECollectionNames.ACCOUNT;
const collectionModel = AccountModel;
const path: string = `${ROOT}/${collectionName.toLowerCase()}/change-password/[id]`;

export const PATCH = async (req: NextRequest): Promise<NextResponse> => {
    try {
        const passwordData = await req.json();
        const { _id, current_password, password } = passwordData;

        if (!_id) {
            return NextResponse.json(
                createErrorMessage(
                    `Đổi mật khẩu không thành công.`,
                    `Thiếu ID tài khoản.`,
                    path,
                    `Vui lòng cung cấp ID tài khoản hợp lệ.`
                ),
                { status: EStatusCode.BAD_REQUEST }
            );
        }

        if (!current_password || !password) {
            return NextResponse.json(
                createErrorMessage(
                    `Đổi mật khẩu không thành công.`,
                    `Thiếu mật khẩu hiện tại hoặc mật khẩu mới.`,
                    path,
                    `Vui lòng cung cấp đầy đủ mật khẩu hiện tại và mật khẩu mới.`
                ),
                { status: EStatusCode.BAD_REQUEST }
            );
        }

        await connectToDatabase();

        // Tìm tài khoản theo ID
        const foundAccount = await collectionModel.findById(_id);

        if (!foundAccount) {
            return NextResponse.json(
                createErrorMessage(
                    `Đổi mật khẩu không thành công.`,
                    `Không tìm thấy tài khoản với ID '${_id}'.`,
                    path,
                    `Vui lòng kiểm tra xem ID tài khoản có đúng không.`
                ),
                { status: EStatusCode.NOT_FOUND }
            );
        }

        // Kiểm tra mật khẩu hiện tại
        const isPasswordMatch = await foundAccount.comparePassword(current_password);

        if (!isPasswordMatch) {
            return NextResponse.json(
                createErrorMessage(
                    `Đổi mật khẩu không thành công.`,
                    `Mật khẩu hiện tại không đúng.`,
                    path,
                    `Vui lòng kiểm tra lại mật khẩu hiện tại.`
                ),
                { status: EStatusCode.UNAUTHORIZED }
            );
        }

        // Hash mật khẩu mới
        const salt = await bcrypt.genSalt(
            process.env.HASH_ROUND ? +process.env.HASH_ROUND : 10
        );
        const hashedPassword = await bcrypt.hash(password, salt);

        // Cập nhật mật khẩu
        const updatedAccount = await collectionModel.findOneAndUpdate(
            { _id },
            {
                $set: {
                    password: hashedPassword,
                    updated_at: new Date(),
                }
            },
            { new: true } // Trả về document sau khi cập nhật
        );

        if (!updatedAccount) {
            return NextResponse.json(
                createErrorMessage(
                    `Đổi mật khẩu không thành công.`,
                    `Không thể cập nhật mật khẩu trong cơ sở dữ liệu.`,
                    path,
                    `Vui lòng liên hệ để biết thêm thông tin.`,
                ),
                { status: EStatusCode.INTERNAL_SERVER_ERROR }
            );
        }

        return NextResponse.json({ success: true, message: "Đổi mật khẩu thành công" }, { status: EStatusCode.OK });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Lỗi không xác định';
        console.error("Lỗi đổi mật khẩu:", errorMessage);

        return NextResponse.json(
            createErrorMessage(
                `Đổi mật khẩu không thành công.`,
                errorMessage,
                path,
                `Vui lòng liên hệ để biết thêm thông tin.`,
            ),
            { status: EStatusCode.INTERNAL_SERVER_ERROR }
        );
    }
} 