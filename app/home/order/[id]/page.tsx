'use client';

import { Button } from '@/components';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { formatCurrency } from '@/utils/format';
import { generatePDF } from '@/utils/generatePDF';
import { use } from 'react';

interface OrderItem {
    product_id: string;
    quantity: number;
    price: number;
}

interface Order {
    _id: string;
    order_code: string;
    created_at: string;
    employee_id: string;
    items: OrderItem[];
    total_amount: number;
    payment_method: string;
    payment_status: boolean;
    note: string;
}

export default function OrderDetail({ params }: { params: Promise<{ id: string }> }) {
    const router = useRouter();
    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [employeeName, setEmployeeName] = useState<string>('');
    const [productNames, setProductNames] = useState<{ [key: string]: string }>({});
    const [productImages, setProductImages] = useState<{ [key: string]: string[] }>({});
    const resolvedParams = use(params);

    useEffect(() => {
        const fetchOrderDetails = async () => {
            try {
                const response = await fetch(`/api/order/${resolvedParams.id}?t=${Date.now()}`);
                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Không thể lấy thông tin đơn hàng');
                }
                const data = await response.json();
                setOrder(data);

                // Lấy thông tin sản phẩm
                const productIds = data.items.map((item: OrderItem) => item.product_id);
                const uniqueProductIds = [...new Set(productIds)];

                const productData: { [key: string]: string } = {};
                const productImageData: { [key: string]: string[] } = {};

                for (const productId of uniqueProductIds) {
                    try {
                        const productResponse = await fetch(`/api/product/${productId}?t=${Date.now()}`);
                        if (productResponse.ok) {
                            const product = await productResponse.json();
                            productData[productId as string] = product.name || 'Sản phẩm không xác định';
                            productImageData[productId as string] = product.image_links || [];
                        }
                    } catch (err) {
                        console.error(`Error fetching product ${productId}:`, err);
                    }
                }

                setProductNames(productData);
                setProductImages(productImageData);

                // Lấy thông tin nhân viên
                try {
                    const employeeResponse = await fetch(`/api/user/account/${data.employee_id}?t=${Date.now()}`);
                    if (employeeResponse.ok) {
                        const employeeData = await employeeResponse.json();
                        const fullName = employeeData.name || 'Chưa xác định';
                        setEmployeeName(fullName);
                    }
                } catch (err) {
                    console.error('Error fetching employee:', err);
                    setEmployeeName('Chưa xác định');
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Có lỗi xảy ra khi tải thông tin đơn hàng');
            } finally {
                setLoading(false);
            }
        };

        if (resolvedParams.id) {
            fetchOrderDetails();
        }
    }, [resolvedParams.id]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    if (error || !order) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen">
                <div className="text-red-500 mb-4">{error || 'Không tìm thấy đơn hàng'}</div>
                <Button
                    onClick={() => router.push('/home/order')}
                    className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                    Quay lại
                </Button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white pb-24">
            <div className="bg-white border-b border-slate-200 sticky top-0 z-40">
                <div className="max-w-[1400px] mx-auto">
                    <div className="h-14 px-5 flex items-center w-fit gap-2">
                        <Button
                            onClick={() => router.push('/home/order')}
                            className="flex items-center p-1 bg-white border border-slate-200 rounded hover:bg-slate-50 transition-all duration-200 shadow-sm min-w-0 w-7 h-7 justify-center"
                        >
                            <Image
                                src="/icons/chevron-left.svg"
                                alt="Quay lại"
                                width={16}
                                height={16}
                                className="text-slate-600"
                            />
                        </Button>
                        <span className="text-lg font-semibold text-slate-900 whitespace-nowrap">Chi tiết đơn hàng</span>
                    </div>
                </div>
            </div>

            <div className="max-w-[1400px] mx-auto p-5">
                <div className="grid grid-cols-3 gap-5">
                    <div className="col-span-2">
                        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                            <h2 className="text-lg font-semibold text-slate-900 mb-5 flex items-center gap-2">
                                <Image
                                    src="/icons/order.svg"
                                    alt="order"
                                    width={20}
                                    height={20}
                                    className="text-slate-700"
                                    priority
                                />
                                Thông tin đơn hàng
                            </h2>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center py-3 border-b border-slate-100">
                                    <span className="text-slate-700">Mã đơn hàng</span>
                                    <span className="font-medium text-slate-900">{order.order_code}</span>
                                </div>
                                <div className="flex justify-between items-center py-3 border-b border-slate-100">
                                    <span className="text-slate-700">Ngày tạo</span>
                                    <span className="font-medium text-slate-900">
                                        {new Date(order.created_at).toLocaleString('vi-VN')}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center py-3 border-b border-slate-100">
                                    <span className="text-slate-700">Nhân viên phụ trách</span>
                                    <span className="font-medium text-slate-900">{employeeName}</span>
                                </div>
                                <div className="flex justify-between items-center py-3 border-b border-slate-100">
                                    <span className="text-slate-700">Trạng thái thanh toán</span>
                                    <span className={`font-medium ${order.payment_status ? 'text-green-600' : 'text-red-600'}`}>
                                        {order.payment_status ? 'Đã thanh toán' : 'Chưa thanh toán'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm mt-5">
                            <h2 className="text-lg font-semibold text-slate-900 mb-5 flex items-center gap-2">
                                <Image
                                    src="/icons/product.svg"
                                    alt="product"
                                    width={20}
                                    height={20}
                                    className="text-slate-700"
                                    priority
                                />
                                Danh sách sản phẩm
                            </h2>
                            <div className="space-y-4">
                                {order.items.map((item, index) => (
                                    <div
                                        key={`${item.product_id || 'unknown'}-${index}`}
                                        className="flex items-center gap-4 p-4 border border-slate-200 rounded-lg"
                                    >
                                        <div className="w-16 h-16 bg-slate-50 rounded-lg relative overflow-hidden flex-shrink-0">
                                            {productImages[item.product_id]?.[0] ? (
                                                <Image
                                                    src={productImages[item.product_id][0]}
                                                    alt={productNames[item.product_id] || 'Sản phẩm'}
                                                    fill
                                                    className="object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <Image
                                                        src="/icons/product.svg"
                                                        alt="product"
                                                        width={24}
                                                        height={24}
                                                        className="text-slate-300"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <h3 className="font-medium text-slate-900 truncate">
                                                {productNames[item.product_id] || 'Sản phẩm không xác định'}
                                            </h3>
                                            <div className="mt-1 text-sm text-slate-500">
                                                {formatCurrency(item.price)}
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="font-medium text-slate-900">
                                                {formatCurrency(item.price * item.quantity)}
                                            </div>
                                            <div className="text-sm text-slate-500">
                                                {item.quantity} sản phẩm
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>

                    <div>
                        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm">
                            <h2 className="text-lg font-semibold text-slate-900 mb-5 flex items-center gap-2">
                                <Image
                                    src="/icons/payment.svg"
                                    alt="payment"
                                    width={20}
                                    height={20}
                                    className="text-slate-700"
                                    priority
                                />
                                Thông tin thanh toán
                            </h2>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center py-3 border-b border-slate-100">
                                    <span className="text-slate-700">Tổng tiền hàng</span>
                                    <span className="font-medium text-slate-900">
                                        {formatCurrency(order.total_amount)}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center py-3 border-b border-slate-100">
                                    <span className="text-slate-700">Giảm giá</span>
                                    <span className="font-medium text-slate-900">0đ</span>
                                </div>
                                <div className="flex justify-between items-center py-3 border-b border-slate-100">
                                    <span className="text-slate-700">Phí giao hàng</span>
                                    <span className="font-medium text-slate-900">0đ</span>
                                </div>
                                <div className="flex justify-between items-center py-3 border-b border-slate-100">
                                    <span className="text-slate-700">Hình thức thanh toán</span>
                                    <span className="font-medium text-slate-900">
                                        {order.payment_method === 'cash' ? 'Tiền mặt' :
                                            order.payment_method === 'transfer' ? 'Chuyển khoản' :
                                                order.payment_method === 'card' ? 'Thẻ' : 'Không xác định'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center py-3">
                                    <span className="font-semibold text-slate-900">Thành tiền</span>
                                    <span className="text-xl font-semibold text-slate-900">
                                        {formatCurrency(order.total_amount)}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {order.note && (
                            <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm mt-5">
                                <h2 className="text-lg font-semibold text-slate-900 mb-5 flex items-center gap-2">
                                    <Image
                                        src="/icons/note.svg"
                                        alt="note"
                                        width={20}
                                        height={20}
                                        className="text-slate-700"
                                        priority
                                    />
                                    Ghi chú
                                </h2>
                                <p className="text-slate-700">{order.note}</p>
                            </div>
                        )}

                        <div className="mt-5 flex gap-3">
                            <Button
                                onClick={() => {
                                    if (order) {
                                        // Prepare order data for PDF generation
                                        const orderData = {
                                            orderId: order.order_code,
                                            employeeName: employeeName,
                                            items: order.items.map(item => ({
                                                product: {
                                                    name: productNames[item.product_id] || 'Sản phẩm không xác định',
                                                    output_price: item.price
                                                },
                                                quantity: item.quantity
                                            })),
                                            totalAmount: order.total_amount,
                                            customerPayment: formatCurrency(order.total_amount).replace(' ₫', ''),
                                            changeAmount: '0',
                                            note: order.note
                                        };
                                        generatePDF(orderData);
                                    }
                                }}
                                className="flex-1 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg hover:bg-slate-50"
                            >
                                In đơn hàng
                            </Button>

                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
} 