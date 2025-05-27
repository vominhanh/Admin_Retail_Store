'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function PaymentSuccess() {
    const searchParams = useSearchParams();
    const [paymentInfo, setPaymentInfo] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [employeeName, setEmployeeName] = useState<string>('Chưa xác định');

    useEffect(() => {
        const fetchEmployee = async () => {
            try {
                const response = await fetch('/api/auth/me');
                if (!response.ok) {
                    throw new Error('Failed to fetch employee');
                }
                const data = await response.json();
                const accountId = data._id;

                const userResponse = await fetch(`/api/user/account/${accountId}`);
                if (!userResponse.ok) {
                    throw new Error('Failed to fetch user details');
                }

                const userData = await userResponse.json();
                setEmployeeName(userData.name || 'Chưa xác định');
            } catch (err) {
                console.error('Error fetching employee:', err);
                setEmployeeName('Chưa xác định');
            }
        };

        fetchEmployee();
    }, []);

    useEffect(() => {
        const saveOrder = async () => {
            try {
                // Lấy thông tin thanh toán từ URL parameters
                const resultCode = searchParams.get('resultCode');
                const orderId = searchParams.get('orderId');
                const transId = searchParams.get('transId');
                const amount = searchParams.get('amount');
                const message = searchParams.get('message');
                const extraData = searchParams.get('extraData');

                // Kiểm tra nếu thanh toán thành công
                if (resultCode === '0') {
                    let orderData = null;
                    try {
                        // Thử parse extraData
                        if (extraData) {
                            // Decode base64 trước
                            const base64Decoded = atob(extraData);
                            // Sau đó decode URL
                            const urlDecoded = decodeURIComponent(base64Decoded);
                            orderData = JSON.parse(urlDecoded);
                            console.log('Decoded extraData:', urlDecoded); // Log để debug
                        }
                    } catch (parseError) {
                        console.error('Lỗi khi parse extraData:', parseError);
                        console.error('Raw extraData:', extraData); // Log raw data để debug
                        setError('Dữ liệu đơn hàng không hợp lệ');
                        return;
                    }

                    if (orderData) {
                        // Gọi API để tạo đơn hàng và cập nhật số lượng
                        const response = await fetch('/api/orders/create', {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                orderData,
                                paymentInfo: {
                                    orderId,
                                    transId,
                                    amount,
                                    message
                                }
                            }),
                        });

                        if (!response.ok) {
                            throw new Error('Lỗi khi tạo đơn hàng');
                        }

                        const data = await response.json();

                        // Tạo lịch sử kho cho từng sản phẩm trong đơn hàng
                        if (data.order && data.order.items) {
                            for (const item of data.order.items) {
                                await fetch('/api/stock-history', {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                    },
                                    body: JSON.stringify({
                                        product_id: item.product_id,
                                        action: 'export',
                                        quantity: item.quantity,
                                        related_receipt_id: data.order._id,
                                        note: `Xuất hàng cho đơn hàng ${orderId}`,
                                        user_name: employeeName
                                    }),
                                });
                            }
                        }

                        setPaymentInfo({
                            resultCode,
                            orderId,
                            transId,
                            amount,
                            message,
                            order: data.order
                        });
                    } else {
                        setError('Không tìm thấy thông tin đơn hàng');
                    }
                } else {
                    setError('Thanh toán không thành công');
                }
            } catch (err) {
                console.error('Lỗi khi lưu đơn hàng:', err);
                setError('Có lỗi xảy ra khi xử lý đơn hàng');
            } finally {
                setIsLoading(false);
            }
        };

        saveOrder();
    }, [searchParams]);

    if (isLoading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
                    <p className="mt-4 text-gray-600">Đang xử lý đơn hàng...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <Card className="max-w-md w-full p-8">
                    <div className="text-center text-red-500">
                        <h2 className="text-2xl font-bold mb-4">Lỗi</h2>
                        <p>{error}</p>
                    </div>
                    <div className="mt-8">
                        <Link href="/" className="w-full">
                            <Button className="w-full">
                                Quay về trang chủ
                            </Button>
                        </Link>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <Card className="max-w-md w-full space-y-8 p-8">
                <div className="text-center">
                    <CheckCircle2 className="mx-auto h-16 w-16 text-green-500" />
                    <h2 className="mt-6 text-3xl font-bold text-gray-900">
                        Thanh toán thành công!
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        Cảm ơn bạn đã sử dụng dịch vụ của chúng tôi
                    </p>
                </div>

                {paymentInfo && (
                    <div className="mt-8 space-y-4">
                        <div className="bg-gray-50 p-4 rounded-lg">
                            <dl className="space-y-2">
                                <div className="flex justify-between">
                                    <dt className="text-sm font-medium text-gray-500">Mã đơn hàng:</dt>
                                    <dd className="text-sm text-gray-900">{paymentInfo.orderId}</dd>
                                </div>
                                <div className="flex justify-between">
                                    <dt className="text-sm font-medium text-gray-500">Mã giao dịch:</dt>
                                    <dd className="text-sm text-gray-900">{paymentInfo.transId}</dd>
                                </div>
                                <div className="flex justify-between">
                                    <dt className="text-sm font-medium text-gray-500">Số tiền:</dt>
                                    <dd className="text-sm text-gray-900">
                                        {new Intl.NumberFormat('vi-VN', {
                                            style: 'currency',
                                            currency: 'VND'
                                        }).format(Number(paymentInfo.amount))}
                                    </dd>
                                </div>
                                <div className="flex justify-between">
                                    <dt className="text-sm font-medium text-gray-500">Nhân viên phụ trách:</dt>
                                    <dd className="text-sm text-gray-900">{employeeName}</dd>
                                </div>
                                <div className="flex justify-between">
                                    <dt className="text-sm font-medium text-gray-500">Hình thức thanh toán:</dt>
                                    <dd className="text-sm text-gray-900">{paymentInfo.order?.paymentMethod || 'Ví MoMo'}</dd>
                                </div>
                            </dl>
                        </div>
                    </div>
                )}

                <div className="mt-8 space-y-4">
                    <Link href="/" className="w-full">
                        <Button className="w-full">
                            Quay về trang chủ
                        </Button>
                    </Link>
                    <Link href="/home/order" className="w-full">
                        <Button variant="outline" className="w-full">
                            Xem đơn hàng của tôi
                        </Button>
                    </Link>
                </div>
            </Card>
        </div>
    );
} 