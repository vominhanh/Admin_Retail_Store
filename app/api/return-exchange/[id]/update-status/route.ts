/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/utils/database';
import ReturnExchangeModel from '@/models/ReturnExchange';

export async function POST(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        // Kết nối database
        await connectToDatabase();

        const id = params.id;
        if (!id) {
            return NextResponse.json(
                { error: 'Thiếu ID của phiếu đổi hàng' },
                { status: 400 }
            );
        }

        // Lấy dữ liệu từ request
        const data = await req.json();
        const { status } = data;

        if (!status) {
            return NextResponse.json(
                { error: 'Thiếu thông tin trạng thái' },
                { status: 400 }
            );
        }

        // Kiểm tra trạng thái hợp lệ
        const validStatus = ['Đang chờ', 'Đang đổi hàng', 'Hoàn thành', 'Đã trả hàng'];
        if (!validStatus.includes(status)) {
            return NextResponse.json(
                { error: 'Trạng thái không hợp lệ' },
                { status: 400 }
            );
        }

        // Tìm và cập nhật phiếu đổi hàng
        const returnExchange = await ReturnExchangeModel.findById(id);
        if (!returnExchange) {
            return NextResponse.json(
                { error: 'Không tìm thấy phiếu đổi hàng' },
                { status: 404 }
            );
        }

        // Cập nhật trạng thái
        returnExchange.status = status;
        await returnExchange.save();

        return NextResponse.json({
            success: true,
            message: `Đã cập nhật trạng thái thành ${status}`,
            data: returnExchange
        });
    } catch (error: any) {
        console.error('Lỗi khi cập nhật trạng thái:', error);
        return NextResponse.json(
            { error: error.message || 'Có lỗi xảy ra khi cập nhật trạng thái' },
            { status: 500 }
        );
    }
} 