import { NextRequest, NextResponse } from 'next/server';
import { OrderShippingModel } from '@/models/OrderShipping';
import { OrderModel } from '@/models/Order';
import { ProductDetailModel } from '@/models/ProductDetail';
import { connectToDatabase } from '@/utils/database';
import { Types } from 'mongoose';

export async function PUT(req: NextRequest, context: { params: { id: string } }) {
    await connectToDatabase();
    const { id } = context.params;
    const body = await req.json();

    // Lấy shipping hiện tại để kiểm tra trạng thái cũ
    const currentShipping = await OrderShippingModel.findById(id);
    if (!currentShipping) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Lấy đúng order_id (có thể là object hoặc string)
    const orderId = currentShipping.order_id?._id || currentShipping.order_id;
    // Nếu chuyển từ pending sang confirmed thì trừ kho và cập nhật trạng thái đơn hàng
    if (currentShipping.status === 'pending' && body.status === 'confirmed') {
        // Lấy thông tin đơn hàng
        const order = await OrderModel.findById(orderId);
        order.status = 'completed';
        order.payment_status = true;
        await order.save();
        if (order && order.items) {
            for (const item of order.items) {
                let quantityToExport = item.quantity;
                const productId = typeof item.product_id === 'string'
                    ? new Types.ObjectId(item.product_id)
                    : item.product_id;
                // Lấy tất cả batch còn tồn kho, FIFO
                const batches = await ProductDetailModel.find({
                    product_id: productId,
                    inventory: { $gt: 0 }
                }).sort({ date_of_manufacture: 1 }); // FIFO

                for (const batch of batches) {
                    if (quantityToExport <= 0) break;
                    const exportQty = Math.min(batch.inventory, quantityToExport);
                    await ProductDetailModel.findByIdAndUpdate(
                        batch._id,
                        {
                            $inc: {
                                inventory: -exportQty,
                                output_quantity: exportQty
                            }
                        }
                    );
                    quantityToExport -= exportQty;
                }
            }
            // Cập nhật trạng thái đơn hàng thành completed

        }
    }

    // Cập nhật trạng thái shipping
    const updated = await OrderShippingModel.findByIdAndUpdate(id, body, { new: true });
    if (!updated) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }
    return NextResponse.json(updated);
} 