import { connectToDatabase } from "@/utils/database";
import { NextRequest, NextResponse } from "next/server";
import { OrderModel } from "@/models/Order";
import { isValidObjectId } from "mongoose";

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await connectToDatabase();
        const resolvedParams = await params;
        const id = resolvedParams.id;

        if (!isValidObjectId(id)) {
            return NextResponse.json(
                { error: 'ID đơn hàng không hợp lệ' },
                { status: 400 }
            );
        }

        const order = await OrderModel.findById(id);

        if (!order) {
            return NextResponse.json(
                { error: 'Không tìm thấy đơn hàng' },
                { status: 404 }
            );
        }

        return NextResponse.json(order);
    } catch (error) {
        console.error('Error fetching order:', error);
        return NextResponse.json(
            { error: 'Không thể lấy thông tin đơn hàng: ' + (error instanceof Error ? error.message : 'Lỗi không xác định') },
            { status: 500 }
        );
    }
}

export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await connectToDatabase();
        const resolvedParams = await params;
        const id = resolvedParams.id;

        if (!isValidObjectId(id)) {
            return NextResponse.json(
                { error: 'ID đơn hàng không hợp lệ' },
                { status: 400 }
            );
        }

        const deletedOrder = await OrderModel.findByIdAndDelete(id);

        if (!deletedOrder) {
            return NextResponse.json(
                { error: 'Không tìm thấy đơn hàng để xóa' },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: 'Đơn hàng đã được xóa thành công',
            deletedOrder
        });
    } catch (error) {
        console.error('Error deleting order:', error);
        return NextResponse.json(
            { error: 'Không thể xóa đơn hàng: ' + (error instanceof Error ? error.message : 'Lỗi không xác định') },
            { status: 500 }
        );
    }
} 