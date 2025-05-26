import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/utils/database';
import { OrderModel } from '@/models/Order';
import { ProductDetailModel } from '@/models/ProductDetail';
import crypto from 'crypto';

// Cấu hình MoMo
const config = {
    accessKey: 'F8BBA842ECF85',
    secretKey: 'K951B6PE1waDMi640xX08PD3vg6EkVlz',
    partnerCode: 'MOMO',
};

export async function POST(req: NextRequest) {
    try {
        // Lấy dữ liệu từ request body
        const body = await req.json();
        console.log('MoMo callback data:', body);

        // Kiểm tra kết quả giao dịch
        const {
            resultCode,
            orderId,
            amount,
            orderInfo,
            transId,
            message,
            signature: receivedSignature,
            extraData
        } = body;

        // Xác thực chữ ký từ MoMo
        const rawSignature = [
            `accessKey=${config.accessKey}`,
            `amount=${amount}`,
            `extraData=${extraData || ''}`,
            `message=${message}`,
            `orderId=${orderId}`,
            `orderInfo=${orderInfo}`,
            `partnerCode=${config.partnerCode}`,
            `requestId=${orderId}`,
            `responseTime=${body.responseTime}`,
            `resultCode=${resultCode}`,
            `transId=${transId}`,
        ].join('&');

        const calculatedSignature = crypto
            .createHmac('sha256', config.secretKey)
            .update(rawSignature)
            .digest('hex');

        // Kiểm tra chữ ký
        if (calculatedSignature !== receivedSignature) {
            console.error('Chữ ký không hợp lệ:', { received: receivedSignature, calculated: calculatedSignature });
            return NextResponse.json({ error: 'Chữ ký không hợp lệ' }, { status: 400 });
        }

        // Nếu thanh toán thành công (resultCode = 0 hoặc 9000)
        if (resultCode === 0 || resultCode === 9000) {
            // Kết nối đến database
            await connectToDatabase();

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

            // Phân tích dữ liệu từ extraData nếu có
            let orderData = null;
            if (extraData && extraData !== '') {
                try {
                    // extraData thường được mã hóa base64
                    const decodedData = Buffer.from(extraData, 'base64').toString('utf-8');
                    orderData = JSON.parse(decodedData);
                } catch (e) {
                    console.error('Lỗi khi phân tích extraData:', e);
                }
            }

            // Nếu không có dữ liệu đơn hàng từ extraData, tạo đơn hàng đơn giản
            if (!orderData) {
                // Tạo đơn hàng mới
                const newOrder = await OrderModel.create({
                    order_code: orderCode,
                    total_amount: parseInt(amount),
                    payment_method: 'momo',
                    payment_status: true,
                    status: 'completed',
                    note: `Thanh toán MoMo - Mã giao dịch: ${transId}`,
                    created_at: new Date(),
                    updated_at: new Date(),
                    momo_trans_id: transId
                });

                // Lưu dữ liệu đơn hàng để hiển thị sau khi thanh toán
                const billData = {
                    orderId: newOrder._id,
                    orderCode: orderCode,
                    momoTransId: transId,
                    paymentTime: new Date(),
                    paymentMethod: 'momo',
                    totalAmount: parseInt(amount)
                };

                return NextResponse.json({
                    success: true,
                    message: 'Thanh toán thành công',
                    billData
                });
            } else {
                // Sử dụng dữ liệu đơn hàng từ extraData để tạo đơn hàng đầy đủ
                // Tạo đơn hàng mới với dữ liệu từ extraData
                const newOrder = await OrderModel.create({
                    ...orderData,
                    order_code: orderCode,
                    payment_status: true,
                    status: 'completed',
                    momo_trans_id: transId,
                    created_at: new Date(),
                    updated_at: new Date()
                });

                // Cập nhật số lượng sản phẩm trong kho
                if (orderData.items && Array.isArray(orderData.items)) {
                    for (const item of orderData.items) {
                        // Nếu có thông tin chi tiết lô
                        if (item.batch_detail && item.batch_detail.detail_id) {
                            const productDetail = await ProductDetailModel.findById(item.batch_detail.detail_id);
                            if (productDetail) {
                                const currentOutput = productDetail.output_quantity || 0;
                                await ProductDetailModel.findByIdAndUpdate(
                                    item.batch_detail.detail_id,
                                    {
                                        output_quantity: currentOutput + item.quantity,
                                        updated_at: new Date()
                                    }
                                );
                            }
                        } else {
                            // Nếu không có thông tin lô, cập nhật lô cũ nhất
                            const productDetails = await ProductDetailModel.find({
                                product_id: item.product_id,
                                inventory: { $gt: 0 }
                            }).sort({ date_of_manufacture: 1 });

                            let remainingQuantity = item.quantity;
                            for (const detail of productDetails) {
                                if (remainingQuantity <= 0) break;

                                const currentInput = detail.input_quantity || 0;
                                const currentOutput = detail.output_quantity || 0;
                                const currentInventory = currentInput - currentOutput;

                                const decreaseAmount = Math.min(remainingQuantity, currentInventory);
                                if (decreaseAmount > 0) {
                                    await ProductDetailModel.findByIdAndUpdate(
                                        detail._id,
                                        {
                                            output_quantity: currentOutput + decreaseAmount,
                                            updated_at: new Date()
                                        }
                                    );
                                    remainingQuantity -= decreaseAmount;
                                }
                            }
                        }
                    }
                }

                // Lưu dữ liệu đơn hàng để hiển thị sau khi thanh toán
                const billData = {
                    orderId: newOrder._id,
                    orderCode: orderCode,
                    momoTransId: transId,
                    paymentTime: new Date(),
                    paymentMethod: 'momo',
                    totalAmount: parseInt(amount),
                    items: orderData.items
                };

                return NextResponse.json({
                    success: true,
                    message: 'Thanh toán thành công',
                    billData
                });
            }
        } else {
            // Thanh toán thất bại
            console.error('Thanh toán thất bại:', { resultCode, message });
            return NextResponse.json({
                success: false,
                message: `Thanh toán thất bại: ${message}`
            });
        }
    } catch (error) {
        console.error('Lỗi xử lý callback MoMo:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Lỗi không xác định' },
            { status: 500 }
        );
    }
} 