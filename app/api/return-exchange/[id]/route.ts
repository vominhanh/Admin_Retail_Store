/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/utils/database';
import ReturnExchangeModel from '@/models/ReturnExchange';

export async function GET(
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

        // Tìm phiếu đổi hàng theo ID
        const returnExchange = await ReturnExchangeModel.findById(id);
        if (!returnExchange) {
            return NextResponse.json(
                { error: 'Không tìm thấy phiếu đổi hàng' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Lấy thông tin phiếu đổi hàng thành công',
            data: returnExchange
        });
    } catch (error: any) {
        console.error('Lỗi khi lấy thông tin phiếu đổi hàng:', error);
        return NextResponse.json(
            { error: error.message || 'Có lỗi xảy ra khi lấy thông tin phiếu đổi hàng' },
            { status: 500 }
        );
    }
}

export async function DELETE(
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

        // Tìm và xóa phiếu đổi hàng
        const returnExchange = await ReturnExchangeModel.findByIdAndDelete(id);
        if (!returnExchange) {
            return NextResponse.json(
                { error: 'Không tìm thấy phiếu đổi hàng' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Xóa phiếu đổi hàng thành công'
        });
    } catch (error: any) {
        console.error('Lỗi khi xóa phiếu đổi hàng:', error);
        return NextResponse.json(
            { error: error.message || 'Có lỗi xảy ra khi xóa phiếu đổi hàng' },
            { status: 500 }
        );
    }
} 