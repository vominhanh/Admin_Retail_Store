import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/utils/database';
import { OrderModel } from '@/models/Order';
import { OrderShippingModel } from '@/models/OrderShipping';

export async function GET() {
    try {
        await connectToDatabase();

        const shippings = await OrderShippingModel.find({})
            .populate('order_id', 'order_number total_amount') // Lấy thêm thông tin đơn hàng
            .populate('customer_id', 'name phone') // Lấy thêm thông tin khách hàng
            .sort({ created_at: -1 }); // Sắp xếp theo thời gian tạo mới nhất

        return NextResponse.json(shippings);
    } catch (error) {
        console.error('Lỗi khi lấy danh sách đơn vận chuyển:', error);
        return NextResponse.json(
            { error: 'Lỗi khi lấy danh sách đơn vận chuyển' },
            { status: 500 }
        );
    }
} 