import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { OrderModel } from '@/models/Order';
import { connectToDatabase } from '@/utils/database';

const secretkey = "K951B6PE1waDMi640xX08PD3vg6EkVlz";

export async function POST(request: Request) {
    try {
        await connectToDatabase();
        const data = await request.json();
        const {
            partnerCode,
            orderId,
            requestId,
            amount,
            orderInfo,
            orderType,
            transId,
            resultCode,
            message,
            payType,
            signature,
            extraData
        } = data;

        console.log('MoMo IPN received:', { orderId, resultCode, message, transId });

        // Tạo chuỗi ký tự để kiểm tra chữ ký
        const rawSignature = `partnerCode=${partnerCode}&orderId=${orderId}&requestId=${requestId}&amount=${amount}&orderInfo=${orderInfo}&orderType=${orderType}&transId=${transId}&resultCode=${resultCode}&message=${message}&payType=${payType}&extraData=${extraData}`;

        // Tạo chữ ký
        const expectedSignature = crypto
            .createHmac('sha256', secretkey)
            .update(rawSignature)
            .digest('hex');

        // Kiểm tra chữ ký
        if (signature !== expectedSignature) {
            console.error('Invalid MoMo signature');
            return NextResponse.json(
                { error: 'Invalid signature' },
                { status: 400 }
            );
        }

        // Xử lý kết quả thanh toán
        if (resultCode === '0') {
            // Tìm đơn hàng dựa trên orderId
            const order = await OrderModel.findOne({
                order_code: orderId.replace('order_', '') // Xóa tiền tố nếu có
            });

            if (!order) {
                console.error('Order not found:', orderId);
                return NextResponse.json(
                    { error: 'Order not found' },
                    { status: 404 }
                );
            }

            // Cập nhật trạng thái đơn hàng
            order.payment_status = true;
            order.status = 'completed';
            order.updated_at = new Date();
            order.payment_method = 'momo';
            order.payment_details = {
                transId,
                payType,
                amount: parseInt(amount),
                paymentTime: new Date()
            };

            await order.save();

            // Cập nhật số lượng sản phẩm
            await updateProductQuantities(order);

            console.log('Order updated successfully:', orderId);
            return NextResponse.json({
                success: true,
                message: 'Payment processed successfully'
            });
        } else {
            console.warn('MoMo payment failed:', { resultCode, message });
            return NextResponse.json({
                success: false,
                message: 'Payment failed',
                resultCode,
                momoMessage: message
            });
        }
    } catch (error) {
        console.error('Error processing IPN:', error);
        return NextResponse.json(
            { error: 'Failed to process IPN' },
            { status: 500 }
        );
    }
}

// Hàm cập nhật số lượng sản phẩm
async function updateProductQuantities(order: any) {
    try {
        if (!order || !order.items || order.items.length === 0) {
            return;
        }

        // Lấy tất cả thông tin chi tiết sản phẩm hiện tại
        const response = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/product-detail?t=${Date.now()}`);
        if (!response.ok) {
            throw new Error('Không thể lấy thông tin chi tiết sản phẩm');
        }

        const productDetails = await response.json();
        const productDetailsMap: Record<string, any[]> = {};

        productDetails.forEach((detail: any) => {
            if (!productDetailsMap[detail.product_id]) {
                productDetailsMap[detail.product_id] = [];
            }
            productDetailsMap[detail.product_id].push(detail);
        });

        // Cập nhật số lượng cho từng sản phẩm trong đơn hàng
        for (const item of order.items) {
            const productId = item.product_id;
            const quantityToDecrease = item.quantity;

            if (productDetailsMap[productId] && productDetailsMap[productId].length > 0) {
                const details = productDetailsMap[productId];
                let remainingQuantity = quantityToDecrease;

                // Sắp xếp lô theo ngày sản xuất để lấy lô cũ nhất trước
                const sortedDetails = details.sort((a, b) => {
                    const dateA = a.date_of_manufacture ? new Date(a.date_of_manufacture).getTime() : 0;
                    const dateB = b.date_of_manufacture ? new Date(b.date_of_manufacture).getTime() : 0;
                    return dateA - dateB;
                });

                // Tiến hành xử lý từng chi tiết sản phẩm
                for (const detail of sortedDetails) {
                    if (remainingQuantity <= 0) break;

                    const currentInput = detail.input_quantity || 0;
                    const currentOutput = detail.output_quantity || 0;
                    const currentInventory = currentInput - currentOutput;

                    // Số lượng có thể bán từ lô này
                    const decreaseAmount = Math.min(remainingQuantity, currentInventory);

                    if (decreaseAmount > 0) {
                        // Tăng output_quantity (số lượng đã bán)
                        const newOutput = currentOutput + decreaseAmount;

                        try {
                            const detailId = detail._id.toString();

                            const updateResponse = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/api/product-detail/${detailId}?t=${Date.now()}`, {
                                method: 'PATCH',
                                headers: {
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                    output_quantity: newOutput,
                                    user_id: order.employee_id,
                                }),
                            });

                            if (!updateResponse.ok) {
                                throw new Error(`Không thể cập nhật chi tiết sản phẩm: ${updateResponse.status}`);
                            }

                            // Giảm số lượng còn phải xử lý
                            remainingQuantity -= decreaseAmount;

                        } catch (updateError) {
                            console.error(`Lỗi khi gửi request PATCH:`, updateError);
                            throw updateError;
                        }
                    }
                }
            }
        }
    } catch (error) {
        console.error('Lỗi khi cập nhật số lượng sản phẩm:', error);
        throw error;
    }
} 