/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { connectToDatabase } from "@/utils/database";
import { NextRequest, NextResponse } from "next/server";
import { OrderModel } from "@/models/Order";
import { isValidObjectId } from "mongoose";

// Hàm validate dữ liệu đầu vào
function validateOrderInput(body: any) {
    if (!body.employee_id || !isValidObjectId(body.employee_id)) {
        return 'ID nhân viên không hợp lệ';
    }
    if (!body.items || body.items.length === 0) {
        return 'Đơn hàng phải có ít nhất một sản phẩm';
    }
    if (body.total_amount === undefined || body.total_amount === null || body.total_amount < 0) {
        return 'Tổng tiền không hợp lệ';
    }
    if (body.payment_method !== 'cancel' && body.status !== 'cancelled' && Number(body.total_amount) > 0 && (!body.customer_payment || Number(body.customer_payment) < Number(body.total_amount))) {
        return 'Số tiền khách đưa phải lớn hơn hoặc bằng thành tiền';
    }
    return null;
}

// Hàm sinh mã đơn hàng
async function generateOrderCode() {
    const today = new Date();
    const dateStr = today.toLocaleDateString('vi-VN').split('/').join('');
    const lastOrder = await OrderModel.findOne({
        order_code: new RegExp(`^HD-${dateStr}-`)
    }).sort({ order_code: -1 });
    let sequence = 1;
    if (lastOrder) {
        const lastSequence = parseInt(lastOrder.order_code.split('-')[2]);
        sequence = lastSequence + 1;
    }
    return `HD-${dateStr}-${sequence.toString().padStart(4, '0')}`;
}

// Hàm tạo đơn hàng
async function createOrder(body: any) {
    const orderCode = await generateOrderCode();
    return await OrderModel.create({
        order_code: orderCode,
        employee_id: body.employee_id,
        items: body.items,
        total_amount: body.total_amount,
        payment_method: body.payment_method,
        payment_status: body.payment_status,
        status: body.status || 'completed',
        note: body.note
    });
}

// Hàm lấy danh sách đơn hàng
async function getOrders({ limit, status, date }: { limit: number, status?: string, date?: string }) {
    const projection = {
        _id: 1,
        order_code: 1,
        employee_id: 1,
        items: 1,
        total_amount: 1,
        payment_method: 1,
        payment_status: 1,
        note: 1,
        created_at: 1,
        updated_at: 1
    };
    let filter: any = {};
    if (status === 'pending') filter.payment_status = false;
    else if (status === 'completed') filter.payment_status = true;
    if (date) {
        const start = new Date(date);
        start.setHours(0, 0, 0, 0);
        const end = new Date(date);
        end.setHours(23, 59, 59, 999);
        filter.created_at = { $gte: start, $lte: end };
    }
    return await OrderModel.find(filter, projection)
        .sort({ created_at: -1 })
        .limit(limit)
        .lean()
        .exec();
}

export async function POST(request: NextRequest) {
    try {
        await connectToDatabase();
        const body = await request.json();
        // Validate
        const errorMsg = validateOrderInput(body);
        if (errorMsg) {
            return NextResponse.json({ error: errorMsg }, { status: 400 });
        }
        // Tạo đơn hàng
        const order = await createOrder(body);
        return NextResponse.json(order);
    } catch (error) {
        console.error('Error creating order:', error);
        if (error instanceof Error) {
            if (error.name === 'ValidationError') {
                return NextResponse.json(
                    { error: 'Dữ liệu không hợp lệ: ' + error.message },
                    { status: 400 }
                );
            }
            // Sửa lỗi linter: kiểm tra code an toàn
            if (error.name === 'MongoError' && typeof (error as any).code === 'number' && (error as any).code === 11000) {
                return NextResponse.json(
                    { error: 'Mã đơn hàng đã tồn tại' },
                    { status: 400 }
                );
            }
        }
        return NextResponse.json(
            { error: 'Không thể tạo đơn hàng: ' + (error instanceof Error ? error.message : 'Lỗi không xác định') },
            { status: 500 }
        );
    }
}

export async function GET(request: NextRequest) {
    try {
        await connectToDatabase();
        const url = new URL(request.url);
        const limit = parseInt(url.searchParams.get('limit') || '1000');
        const status = url.searchParams.get('status') || undefined;
        const date = url.searchParams.get('date') || undefined;
        const orders = await getOrders({ limit, status, date });
        return NextResponse.json(orders);
    } catch (error) {
        console.error('Error fetching orders:', error);
        return NextResponse.json(
            { error: 'Không thể lấy danh sách đơn hàng: ' + (error instanceof Error ? error.message : 'Lỗi không xác định') },
            { status: 500 }
        );
    }
} 