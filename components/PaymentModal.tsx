'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components';
import { formatCurrency } from '@/utils/format';
import { EButtonType } from '@/components/button/interfaces/button-type.interface';

interface OrderItem {
    product_id: string;
    quantity: number;
    price: number;
    product?: {
        _id: string;
        name: string;
        image_links?: string[];
    };
}

interface IProductDetail {
    _id: string;
    product_id: string;
    input_quantity: number;
    output_quantity: number;
    date_of_manufacture: Date;
    expiry_date: Date;
    created_at: Date;
    updated_at: Date;
}

interface PaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onComplete: () => void;
    orderId: string;
    totalAmount: number;
    orderItems?: OrderItem[];
}

export default function PaymentModal({ isOpen, onClose, onComplete, orderId, totalAmount, orderItems = [] }: PaymentModalProps) {
    const [paymentMethod, setPaymentMethod] = useState<string>('cash');
    const [customerPayment, setCustomerPayment] = useState<string>(totalAmount.toLocaleString());
    const [changeAmount, setChangeAmount] = useState<string>('0');
    const [isProcessing, setIsProcessing] = useState(false);
    const [momoPaymentUrl, setMomoPaymentUrl] = useState<string>('');

    useEffect(() => {
        setCustomerPayment(totalAmount.toLocaleString());
        setMomoPaymentUrl('');
    }, [totalAmount, isOpen]);

    const handlePaymentMethodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setPaymentMethod(e.target.value);
        if (e.target.value === 'momo') {
            handleMoMoPayment();
        }
    };

    const handlePaymentAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Loại bỏ tất cả các ký tự không phải số
        const value = e.target.value.replace(/[^\d]/g, '');

        // Nếu value rỗng, set về 0
        if (!value) {
            setCustomerPayment('0');
            setChangeAmount('0');
            return;
        }

        // Chuyển thành số và format với dấu phẩy
        const numberValue = parseInt(value);
        setCustomerPayment(numberValue.toLocaleString());

        // Tính số tiền thối lại
        const change = numberValue - totalAmount;
        setChangeAmount(change >= 0 ? change.toLocaleString() : '0');
    };

    // Hàm cập nhật số lượng sản phẩm đang bán
    const updateProductQuantities = async () => {
        try {
            console.log("Bắt đầu cập nhật số lượng sản phẩm sau khi thanh toán...");

            if (!orderItems || orderItems.length === 0) {
                console.log("Không có sản phẩm để cập nhật số lượng.");
                return;
            }

            // Lấy tất cả thông tin chi tiết sản phẩm hiện tại
            const response = await fetch(`/api/product-detail?t=${Date.now()}`);
            if (!response.ok) {
                throw new Error('Không thể lấy thông tin chi tiết sản phẩm');
            }

            const productDetails: IProductDetail[] = await response.json();
            console.log(`Đã lấy ${productDetails.length} chi tiết sản phẩm`);

            // Tạo bản đồ chi tiết sản phẩm theo product_id
            const productDetailsMap: Record<string, IProductDetail[]> = {};

            productDetails.forEach(detail => {
                if (!productDetailsMap[detail.product_id]) {
                    productDetailsMap[detail.product_id] = [];
                }
                productDetailsMap[detail.product_id].push(detail);
            });

            // Cập nhật số lượng cho từng sản phẩm trong đơn hàng
            for (const orderItem of orderItems) {
                const productId = orderItem.product_id;
                const quantityToDecrease = orderItem.quantity;
                const productName = orderItem.product?.name || `Sản phẩm #${productId}`;

                console.log(`Cập nhật sản phẩm ${productName} - ID: ${productId} - Số lượng: ${quantityToDecrease}`);

                if (productDetailsMap[productId] && productDetailsMap[productId].length > 0) {
                    const details = productDetailsMap[productId];
                    let remainingQuantity = quantityToDecrease;

                    // Process each product detail
                    for (const detail of details) {
                        if (remainingQuantity <= 0) break;

                        const currentInput = detail.input_quantity || 0;
                        const currentOutput = detail.output_quantity || 0;
                        const currentInventory = currentInput - currentOutput;

                        // Số lượng có thể bán từ lô này
                        const decreaseAmount = Math.min(remainingQuantity, currentInventory);

                        if (decreaseAmount > 0) {
                            // Sửa lại: Tăng output_quantity (số lượng đã bán)
                            const newOutput = currentOutput + decreaseAmount; // Đúng: output tăng thêm số lượng bán

                            try {
                                const detailId = detail._id.toString();
                                console.log(`Cập nhật chi tiết sản phẩm ${detailId}:
                                    - Số lượng đã bán cũ: ${currentOutput}
                                    - Số lượng bán thêm: ${decreaseAmount}
                                    - Số lượng đã bán mới: ${newOutput}
                                    - Tồn kho mới: ${currentInput - newOutput} // inventory sẽ giảm vì output tăng
                                `);

                                const updateResponse = await fetch(`/api/product-detail/${detailId}?t=${Date.now()}`, {
                                    method: 'PATCH',
                                    headers: {
                                        'Content-Type': 'application/json',
                                    },
                                    body: JSON.stringify({
                                        output_quantity: newOutput, // Gửi output mới đã tăng
                                    }),
                                });

                                if (!updateResponse.ok) {
                                    const errorText = await updateResponse.text();
                                    console.error(`Lỗi khi cập nhật chi tiết sản phẩm ${detailId}:`, errorText);
                                    throw new Error(`Không thể cập nhật chi tiết sản phẩm: ${updateResponse.status} ${updateResponse.statusText}`);
                                }

                                // Giảm số lượng còn phải xử lý
                                remainingQuantity -= decreaseAmount;
                                console.log(`Đã cập nhật số lượng đã bán: ${decreaseAmount}. Còn lại cần xử lý: ${remainingQuantity}`);

                            } catch (updateError) {
                                console.error(`Lỗi khi gửi request PATCH:`, updateError);
                                throw updateError;
                            }
                        }
                    }

                    if (remainingQuantity > 0) {
                        console.warn(`Không đủ số lượng cho sản phẩm ${productName}. Còn lại ${remainingQuantity} không thể xử lý.`);
                    }
                }
            }

            console.log("Hoàn thành cập nhật số lượng sản phẩm sau khi thanh toán");

        } catch (error) {
            console.error('Lỗi khi cập nhật số lượng sản phẩm:', error);
            // Không hiển thị thông báo lỗi cho người dùng trong trường hợp này
            // vì đơn hàng đã được thanh toán thành công
            console.warn("Thanh toán vẫn thành công mặc dù có lỗi khi cập nhật số lượng sản phẩm");
        }
    };

    const handleMoMoPayment = async () => {
        try {
            const response = await fetch('/api/payment/momo', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    orderId: orderId,
                    amount: totalAmount,
                    orderInfo: `Thanh toan don hang ${orderId}`
                }),
            });

            const data = await response.json();
            if (data.payUrl) {
                setMomoPaymentUrl(data.payUrl);
                window.open(data.payUrl, '_blank');
            } else {
                throw new Error('Không thể tạo URL thanh toán MoMo');
            }
        } catch (error) {
            console.error('Lỗi khi tạo thanh toán MoMo:', error);
            alert('Có lỗi xảy ra khi tạo thanh toán MoMo. Vui lòng thử lại sau.');
        }
    };

    const handleCompletePayment = async () => {
        setIsProcessing(true);
        try {
            if (paymentMethod === 'momo' && !momoPaymentUrl) {
                alert('Vui lòng chờ URL thanh toán MoMo được tạo');
                setIsProcessing(false);
                return;
            }

            console.log("Bắt đầu cập nhật trạng thái thanh toán cho đơn hàng: " + orderId);

            const updateOrderResponse = await fetch(`/api/order/draft?t=${Date.now()}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    orderId: orderId,
                    payment_method: paymentMethod,
                    payment_status: true
                }),
            });

            if (!updateOrderResponse.ok) {
                throw new Error('Không thể cập nhật trạng thái thanh toán');
            }

            await updateProductQuantities();
            onComplete();
            onClose();
        } catch (error) {
            console.error('Lỗi khi hoàn tất thanh toán:', error);
            alert('Có lỗi xảy ra khi hoàn tất thanh toán. Vui lòng thử lại sau.');
        } finally {
            setIsProcessing(false);
        }
    };

    const renderMoMoQRCode = () => {
        return (
            <div className="flex flex-col items-center mt-4 bg-white p-6 rounded-xl shadow-md">
                <h3 className="font-semibold text-lg mb-4 text-[#d82d8b]">Quét mã để thanh toán qua MoMo</h3>

                {/* Mã QR MoMo SVG trực tiếp thay vì ảnh */}
                <svg width="200" height="200" viewBox="0 0 200 200" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect width="200" height="200" fill="white" />
                    <path d="M84 32H32V84H84V32Z" fill="black" />
                    <path d="M116 32H100V48H116V32Z" fill="black" />
                    <path d="M148 32H132V48H148V32Z" fill="black" />
                    <path d="M84 64H68V80H84V64Z" fill="white" />
                    <path d="M148 48H132V64H148V48Z" fill="black" />
                    <path d="M116 64H100V80H116V64Z" fill="black" />
                    <path d="M100 116H84V132H100V116Z" fill="black" />
                    <path d="M68 100H52V116H68V100Z" fill="black" />
                    <path d="M132 116H116V132H132V116Z" fill="black" />
                    <path d="M84 132H68V148H84V132Z" fill="black" />
                    <path d="M148 100H132V116H148V100Z" fill="black" />
                    <path d="M116 132H100V148H116V132Z" fill="black" />
                    <path d="M132 148H116V164H132V148Z" fill="black" />
                    <path d="M148 164H132V168H148V164Z" fill="black" />
                    <path d="M168 32H152V48H168V32Z" fill="black" />
                    <path d="M168 64H152V80H168V64Z" fill="black" />
                    <path d="M168 116H152V132H168V116Z" fill="black" />
                    <path d="M168 148H152V164H168V148Z" fill="black" />
                    <path d="M84 148H68V168H84V148Z" fill="black" />
                    <path d="M52 148H32V168H52V148Z" fill="black" />
                    <path d="M168 32V84H116V32H168Z" stroke="black" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M84 116V168H32V116H84Z" stroke="black" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M168 116V168H116V116H168Z" stroke="black" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
                    <rect width="200" height="200" stroke="#D82D8B" strokeWidth="8" />
                </svg>

                <div className="mt-4 text-center">
                    <p className="text-gray-600 text-sm">Số tiền: {formatCurrency(totalAmount)}</p>
                    <p className="text-gray-500 text-xs mt-1">Mã đơn hàng: {orderId}</p>
                </div>
            </div>
        );
    };

    if (!isOpen) return null;

    return (
        <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center ${isOpen ? '' : 'hidden'}`}>
            <div className="bg-white p-6 rounded-lg w-96">
                <h2 className="text-xl font-bold mb-4">Thanh toán đơn hàng</h2>

                <div className="mb-4">
                    <label className="block text-sm font-medium mb-2">Phương thức thanh toán</label>
                    <select
                        value={paymentMethod}
                        onChange={handlePaymentMethodChange}
                        className="w-full p-2 border rounded"
                        disabled={isProcessing}
                    >
                        <option value="cash">Tiền mặt</option>
                        <option value="momo">MoMo</option>
                    </select>
                </div>

                {paymentMethod === 'cash' && (
                    <>
                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-2">Số tiền khách trả</label>
                            <input
                                type="text"
                                value={customerPayment}
                                onChange={handlePaymentAmountChange}
                                className="w-full p-2 border rounded"
                                disabled={isProcessing}
                            />
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-2">Tiền thối</label>
                            <input
                                type="text"
                                value={changeAmount}
                                className="w-full p-2 border rounded bg-gray-100"
                                disabled
                            />
                        </div>
                    </>
                )}

                {paymentMethod === 'momo' && momoPaymentUrl && (
                    <div className="mb-4">
                        <p className="text-sm text-gray-600">
                            Đã mở cửa sổ thanh toán MoMo. Vui lòng hoàn tất thanh toán và nhấn "Hoàn tất" sau khi thanh toán thành công.
                        </p>
                    </div>
                )}

                <div className="flex justify-end gap-2">
                    <Button
                        type={EButtonType.TRANSPARENT}
                        onClick={onClose}
                        isDisable={isProcessing}
                    >
                        Hủy
                    </Button>
                    <Button
                        type={EButtonType.SUCCESS}
                        onClick={handleCompletePayment}
                        isDisable={isProcessing}
                    >
                        {isProcessing ? 'Đang xử lý...' : 'Hoàn tất'}
                    </Button>
                </div>
            </div>
        </div>
    );
} 