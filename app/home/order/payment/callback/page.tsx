'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';

export default function PaymentCallback() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState<string>('Đang xử lý kết quả thanh toán...');

    useEffect(() => {
        const resultCode = searchParams.get('resultCode');
        const orderId = searchParams.get('orderId');
        const orderInfo = searchParams.get('orderInfo');
        const amount = searchParams.get('amount');

        if (resultCode === '0') {
            // Lấy thông tin đơn hàng tạm từ localStorage
            const orderDraft = localStorage.getItem('momo_order_draft');
            if (orderDraft) {
                // Hiển thị trạng thái đang xử lý
                setMessage('Đang tạo đơn hàng...');

                // Tạo đơn hàng từ dữ liệu đã lưu
                fetch('/api/order', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: orderDraft
                })
                    .then(res => {
                        if (!res.ok) {
                            throw new Error('Lỗi khi tạo đơn hàng');
                        }
                        return res.json();
                    })
                    .then(orderData => {
                        // Cập nhật số lượng sản phẩm
                        setMessage('Đang cập nhật số lượng sản phẩm...');
                        return updateProductQuantities(JSON.parse(orderDraft))
                            .then(() => orderData);
                    })
                    .then(orderData => {
                        // Xóa dữ liệu tạm
                        localStorage.removeItem('momo_order_draft');

                        // Hiển thị thành công
                        setStatus('success');
                        setMessage(`Thanh toán thành công! Đơn hàng #${orderData.order_code || orderData._id} đã được tạo.`);

                        // Tự động chuyển về trang đơn hàng sau 3 giây
                        setTimeout(() => {
                            router.push('/home/order');
                        }, 3000);
                    })
                    .catch(error => {
                        console.error('Lỗi xử lý đơn hàng:', error);
                        setStatus('error');
                        setMessage('Thanh toán thành công nhưng tạo đơn hàng thất bại! Vui lòng liên hệ quản trị viên.');
                    });
            } else {
                setStatus('error');
                setMessage('Không tìm thấy thông tin đơn hàng! Vui lòng thử lại.');
            }
        } else {
            setStatus('error');
            setMessage(`Thanh toán thất bại. Mã lỗi: ${resultCode || 'không xác định'}. Vui lòng thử lại sau.`);
        }
    }, [searchParams, router]);

    // Hàm cập nhật số lượng sản phẩm
    const updateProductQuantities = async (orderData: any) => {
        try {
            if (!orderData || !orderData.items || orderData.items.length === 0) {
                return;
            }

            // Lấy tất cả thông tin chi tiết sản phẩm hiện tại
            const response = await fetch(`/api/product-detail?t=${Date.now()}`);
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
            for (const item of orderData.items) {
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

                                const updateResponse = await fetch(`/api/product-detail/${detailId}?t=${Date.now()}`, {
                                    method: 'PATCH',
                                    headers: {
                                        'Content-Type': 'application/json',
                                    },
                                    body: JSON.stringify({
                                        output_quantity: newOutput,
                                        user_id: orderData.employee_id,
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
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-50">
            <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center">
                {status === 'loading' && (
                    <div className="animate-spin mx-auto mb-4">
                        <Image src="/icons/loading.svg" alt="Loading" width={50} height={50} />
                    </div>
                )}

                {status === 'success' && (
                    <div className="text-green-500 mx-auto mb-4">
                        <Image src="/icons/check-circle.svg" alt="Success" width={60} height={60} />
                    </div>
                )}

                {status === 'error' && (
                    <div className="text-red-500 mx-auto mb-4">
                        <Image src="/icons/alert-circle.svg" alt="Error" width={60} height={60} />
                    </div>
                )}

                <h1 className={`text-2xl font-bold mb-4 ${status === 'success' ? 'text-green-600' :
                        status === 'error' ? 'text-red-600' : 'text-blue-600'
                    }`}>
                    {status === 'success' ? 'Thanh toán thành công!' :
                        status === 'error' ? 'Thanh toán thất bại!' : 'Đang xử lý...'}
                </h1>

                <p className="text-gray-600 mb-6">{message}</p>

                <button
                    onClick={() => router.push('/home/order')}
                    className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-all"
                >
                    Quay lại danh sách đơn hàng
                </button>
            </div>
        </div>
    );
} 