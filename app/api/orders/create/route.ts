import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/utils/database';
import { OrderModel } from '@/models/Order';
import { ProductDetailModel } from '@/models/ProductDetail';

export async function POST(req: NextRequest) {
    try {
        await connectToDatabase();
        const body = await req.json();
        const { orderData, paymentInfo } = body;

        // Kiểm tra xem đơn hàng đã tồn tại chưa
        const existingOrder = await OrderModel.findOne({ order_code: paymentInfo.orderId });
        if (existingOrder) {
            return NextResponse.json({
                success: true,
                order: existingOrder,
                message: 'Đơn hàng đã được xử lý trước đó'
            });
        }

        // Tạo đơn hàng mới
        const newOrder = await OrderModel.create({
            order_code: paymentInfo.orderId,
            employee_id: orderData.employee_id,
            items: orderData.items.map((item: any) => ({
                product_id: item.product_id,
                quantity: item.quantity,
                price: item.price,
                batch_detail: item.batch_detail
            })),
            total_amount: parseInt(paymentInfo.amount || '0'),
            payment_method: 'momo',
            payment_status: true,
            status: 'completed',
            note: `Thanh toán MoMo - Mã giao dịch: ${paymentInfo.transId}`,
            created_at: new Date(),
            updated_at: new Date(),
            momo_trans_id: paymentInfo.transId
        });

        // Cập nhật số lượng sản phẩm trong kho
        for (const item of orderData.items) {
            const batchDetail = item.batch_detail;
            if (batchDetail && batchDetail.detail_id) {
                // Cập nhật số lượng xuất và số lượng tồn kho
                await ProductDetailModel.findByIdAndUpdate(
                    batchDetail.detail_id,
                    {
                        $inc: {
                            output_quantity: item.quantity,  // Tăng số lượng xuất
                            inventory: -item.quantity  // Giảm số lượng tồn kho
                        }
                    }
                );
            }
        }

        return NextResponse.json({
            success: true,
            order: newOrder
        });
    } catch (error) {
        console.error('Lỗi khi tạo đơn hàng:', error);

        // Xử lý lỗi duplicate key
        if (error instanceof Error && error.message.includes('duplicate key error')) {
            // Nếu là lỗi trùng lặp, tìm đơn hàng đã tồn tại
            const existingOrder = await OrderModel.findOne({ order_code: paymentInfo.orderId });
            if (existingOrder) {
                return NextResponse.json({
                    success: true,
                    order: existingOrder,
                    message: 'Đơn hàng đã được xử lý trước đó'
                });
            }
        }

        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Lỗi không xác định' },
            { status: 500 }
        );
    }
} 