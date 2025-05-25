/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/utils/database';
import ReturnExchangeModel from '@/models/ReturnExchange';
import { ProductDetailModel } from '@/models/ProductDetail';
import { OrderModel } from '@/models/Order';
import { StockHistoryModel } from '@/models/StockHistory';

export async function POST(req: NextRequest) {
    try {
        // Kết nối database
        await connectToDatabase();

        // Lấy dữ liệu từ request
        const data = await req.json();
        console.log("Data from request:", JSON.stringify(data, null, 2));

        const {
            receipt_id,
            order_id,
            customer_id,
            old_product_details,
            new_product_detail,
            action,
            status,
            additional_payment,
            order_update,
            note,
            user_name
        } = data;

        // Kiểm tra dữ liệu bắt buộc
        if (!receipt_id || !order_id || !customer_id || !old_product_details || !action) {
            return NextResponse.json(
                { error: 'Thiếu thông tin bắt buộc' },
                { status: 400 }
            );
        }

        // PHẦN 1: CẬP NHẬT TỒN KHO
        if (old_product_details && new_product_detail) {
            for (const oldDetail of old_product_details) {
                const oldProductDetail = await ProductDetailModel.findOne({ product_id: oldDetail.product_id });
                if (oldProductDetail) {
                    oldProductDetail.inventory += oldDetail.quantity;
                    oldProductDetail.output_quantity = Math.max(0, (oldProductDetail.output_quantity || 0) - oldDetail.quantity);
                    await oldProductDetail.save();
                    console.log(`Tăng tồn kho và giảm xuất cho sản phẩm cũ: ${oldDetail.product_id}`);
                    // Tạo lịch sử nhập kho (return)
                    await StockHistoryModel.create({
                        product_id: oldDetail.product_id,
                        batch_number: oldProductDetail.batch_number,
                        action: 'exchange',
                        quantity: oldDetail.quantity,
                        related_receipt_id: order_id,
                        note: `Nhập kho khi đổi hàng từ hóa đơn ${receipt_id}`,
                        user_name: user_name || customer_id || 'system',
                    });
                }
            }
            const newProductDetailDoc = await ProductDetailModel.findOne({ product_id: new_product_detail.product_id });
            if (newProductDetailDoc) {
                const exportQty = new_product_detail.quantity * (new_product_detail.unit_ratio || 1);
                newProductDetailDoc.inventory = Math.max(0, (newProductDetailDoc.inventory || 0) - exportQty);
                newProductDetailDoc.output_quantity = (newProductDetailDoc.output_quantity || 0) + exportQty;
                await newProductDetailDoc.save();
                console.log(`Giảm tồn kho và tăng xuất cho sản phẩm mới: ${new_product_detail.product_id}`);
                // Tạo lịch sử xuất kho (exchange)
                await StockHistoryModel.create({
                    product_id: new_product_detail.product_id,
                    batch_number: newProductDetailDoc.batch_number,
                    action: 'exchange',
                    quantity: exportQty,
                    related_receipt_id: order_id,
                    note: `Xuất kho khi đổi hàng từ hóa đơn ${receipt_id}`,
                    user_name: user_name || customer_id || 'system',
                });
            }
        }

        // PHẦN 2: CẬP NHẬT ĐƠN HÀNG
        if (order_update) {
            try {
                if (action === 'exchange' && new_product_detail && order_update.old_product_detail_id) {
                    // Cập nhật mảng items trong order
                    const order = await OrderModel.findById(order_id);
                    if (!order) throw new Error('Không tìm thấy đơn hàng');

                    // Tìm vị trí sản phẩm cũ trong items
                    const itemIndex = order.items.findIndex((item: { product_id: string }) =>
                        String(item.product_id) === String(order_update.old_product_detail_id));

                    if (itemIndex === -1) throw new Error('Không tìm thấy sản phẩm cũ trong đơn hàng');

                    // Thay thế bằng sản phẩm mới
                    order.items[itemIndex] = {
                        product_id: new_product_detail.product_id,
                        quantity: new_product_detail.quantity,
                        price: new_product_detail.price
                    };

                    // Cập nhật lại tổng tiền đơn hàng
                    order.total_amount = order.items.reduce(
                        (sum: number, item: { price: number, quantity: number }) =>
                            sum + (item.price * item.quantity),
                        0
                    );

                    console.log(`Đã cập nhật tổng tiền đơn hàng: ${order.total_amount.toLocaleString('vi-VN')} VNĐ`);
                    await order.save();
                } else {
                    // Giữ nguyên logic cũ cho các trường hợp khác
                    const order = await OrderModel.findById(order_id);
                    if (!order) {
                        throw new Error(`Không tìm thấy đơn hàng ${order_id}`);
                    }

                    console.log(`Chi tiết đơn hàng trước khi cập nhật: ${JSON.stringify(order.prodetail || [], null, 2)}`);

                    // Xóa sản phẩm cũ khỏi prodetail
                    if (order.prodetail && Array.isArray(order.prodetail) && order_update.old_product_detail_id) {
                        order.prodetail = order.prodetail.filter(
                            (item: any) => !(item._id && item._id.toString() === order_update.old_product_detail_id)
                        );
                    }

                    // Thêm sản phẩm mới vào prodetail với đầy đủ thông tin lô mới
                    if (new_product_detail) {
                        order.prodetail.push({
                            _id: new_product_detail.product_detail_id || new_product_detail._id,
                            product_id: new_product_detail.product_id,
                            product_name: new_product_detail.product_name,
                            price: new_product_detail.price,
                            quantity: new_product_detail.quantity,
                            expiry_date: new_product_detail.expiry_date,
                            barcode: new_product_detail.barcode,
                            inventory: new_product_detail.inventory,
                            unit: new_product_detail.unit,
                            unit_ratio: new_product_detail.unit_ratio,
                            total: new_product_detail.price * new_product_detail.quantity,
                        });
                    }

                    // Cập nhật tổng tiền từ tất cả các sản phẩm trong prodetail
                    if (order.prodetail && Array.isArray(order.prodetail)) {
                        order.total_amount = order.prodetail.reduce(
                            (sum: number, item: { price: number, quantity: number }) =>
                                sum + (item.price * item.quantity),
                            0
                        );
                        console.log(`Đã cập nhật tổng tiền đơn hàng từ prodetail: ${order.total_amount.toLocaleString('vi-VN')} VNĐ`);
                    }

                    // Thêm ghi chú
                    if (note) {
                        order.note = order.note
                            ? `${order.note}; ${note}`
                            : note;
                    }

                    // Lưu đơn hàng
                    await order.save();
                    console.log(`Đã cập nhật đơn hàng ${order_id}`);
                    console.log(`Chi tiết đơn hàng sau khi cập nhật: ${JSON.stringify(order.prodetail || [], null, 2)}`);
                }
            } catch (error: any) {
                console.error('Lỗi khi cập nhật đơn hàng:', error);
                return NextResponse.json(
                    { error: `Lỗi khi cập nhật đơn hàng: ${error.message}` },
                    { status: 500 }
                );
            }
        }

        // PHẦN 3: TẠO PHIẾU ĐỔI HÀNG
        try {
            // Tạo phiếu đổi hàng
            const returnExchange = new ReturnExchangeModel({
                receipt_id,
                order_id,
                customer_id,
                product_details: old_product_details,
                action,
                created_at: new Date(),
                status: status || 'Hoàn thành',
                note,
                exchange_info: action === 'exchange' ? {
                    new_product_id: new_product_detail.product_id,
                    new_product_name: new_product_detail.product_name,
                    quantity: new_product_detail.quantity,
                    unit: new_product_detail.unit,
                    unit_ratio: new_product_detail.unit_ratio,
                    price: new_product_detail.price,
                    additional_payment: additional_payment || 0
                } : undefined
            });

            // Lưu phiếu đổi hàng
            const savedReturnExchange = await returnExchange.save();
            console.log(`Đã tạo phiếu đổi hàng ${savedReturnExchange._id}`);

            // Trả về kết quả
            return NextResponse.json({
                success: true,
                message: action === 'exchange' ? 'Đổi hàng thành công' : 'Trả hàng thành công',
                data: savedReturnExchange
            });
        } catch (error: any) {
            console.error('Lỗi khi tạo phiếu đổi hàng:', error);
            return NextResponse.json(
                { error: `Lỗi khi tạo phiếu đổi hàng: ${error.message}` },
                { status: 500 }
            );
        }
    } catch (error: any) {
        console.error('Lỗi khi xử lý đổi hàng:', error);
        return NextResponse.json(
            { error: error.message || 'Có lỗi xảy ra khi xử lý đổi hàng' },
            { status: 500 }
        );
    }
} 