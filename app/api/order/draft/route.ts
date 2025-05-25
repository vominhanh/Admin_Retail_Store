import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/utils/database';
import { OrderModel } from '@/models/Order';

// API tạo đơn hàng nháp
export async function POST(req: Request) {
    try {
        await connectToDatabase();
        const data = await req.json();

        // Tạo mã đơn hàng theo format: [Loại giao dịch] - [NgàyThangNam] - [Số thứ tự]
        const today = new Date();
        const dateStr = today.toLocaleDateString('vi-VN').split('/').join('');

        // Lấy số thứ tự từ đơn hàng cuối cùng trong ngày
        const lastOrder = await OrderModel.findOne({
            order_code: new RegExp(`^HD-${dateStr}-`)
        }).sort({ order_code: -1 });

        let sequence = 1;
        if (lastOrder) {
            const lastSequence = parseInt(lastOrder.order_code.split('-')[2]);
            sequence = lastSequence + 1;
        }

        const orderCode = `HD-${dateStr}-${sequence.toString().padStart(4, '0')}`;

        const draftOrder = await OrderModel.create({
            ...data,
            order_code: orderCode,
            status: 'pending', // Trạng thái chờ thanh toán
            payment_status: false, // Chưa thanh toán
            created_at: new Date(),
            updated_at: new Date()
        });

        return NextResponse.json(draftOrder, { status: 201 });
    } catch (error: unknown) {
        console.error('Error saving draft order:', error);
        return NextResponse.json(
            { error: 'Không thể lưu đơn hàng: ' + error },
            { status: 500 }
        );
    }
}

// API lấy danh sách đơn hàng nháp
export async function GET() {
    try {
        await connectToDatabase();
        const pendingOrders = await OrderModel.find({
            status: 'pending',
            payment_status: false
        })
            .sort({ created_at: -1 })
            .populate('employee_id', 'name')
            .lean() // Tối ưu hóa truy vấn
            .exec();

        return NextResponse.json(pendingOrders);
    } catch (error: unknown) {
        console.error('Error fetching pending orders:', error);
        return NextResponse.json(
            { error: 'Không thể lấy danh sách đơn hàng chờ thanh toán: ' + error },
            { status: 500 }
        );
    }
}

// API cập nhật trạng thái đơn hàng
export async function PATCH(req: Request) {
    try {
        await connectToDatabase();
        const data = await req.json();
        const { orderId } = data;

        const updatedOrder = await OrderModel.findByIdAndUpdate(
            orderId,
            {
                status: 'completed',
                payment_status: true,
                updated_at: new Date()
            },
            { new: true }
        );

        if (!updatedOrder) {
            return NextResponse.json(
                { error: 'Không tìm thấy đơn hàng' },
                { status: 404 }
            );
        }

        return NextResponse.json(updatedOrder);
    } catch (error: unknown) {
        console.error('Error updating order status:', error);
        return NextResponse.json(
            { error: 'Không thể cập nhật đơn hàng: ' + error },
            { status: 500 }
        );
    }
} 