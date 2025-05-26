/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { Button } from '@/components';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import type { IProduct } from '@/interfaces/product.interface';
import { useEffect, useState, useRef, useCallback } from 'react';
import { formatCurrency } from '@/utils/format';
import { IProductDetail } from '@/interfaces/product-detail.interface';
import { generatePDF } from '@/utils/generatePDF';
import BarcodeScanner from '@/components/barcode-scanner';
import dynamic from 'next/dynamic';
import CustomNotification, { ENotificationType } from '@/components/notify/notification/notification';
import useNotificationsHook from '@/hooks/notifications-hook';


const DynamicReactBarcode = dynamic(() => import('react-barcode'), { ssr: false });

interface OrderItem {
    product: IProduct;
    quantity: number;
    batchDetails?: {
        detailId: string;
        dateOfManufacture: Date | null;
        expiryDate: Date | null;
    };
}

export default function CreateOrder() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { createNotification, notificationElements } = useNotificationsHook();
    const [products, setProducts] = useState<IProduct[]>([]);
    const [, setLoading] = useState(true);
    const [, setError] = useState<string | null>(null);
    const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
    const [employee, setEmployee] = useState<string>('');
    const [employeeName, setEmployeeName] = useState<string>('');
    const [paymentMethod, setPaymentMethod] = useState<string>('cash');
    const [displayPaymentText, setDisplayPaymentText] = useState<string>('Thanh toán tiền mặt');
    const [customerPayment, setCustomerPayment] = useState<string>('0');
    const [changeAmount, setChangeAmount] = useState<string>('0');
    const [note, setNote] = useState<string>('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSavingDraft, setIsSavingDraft] = useState(false);
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [productStockInfo, setProductStockInfo] = useState<Record<string, Array<{
        quantity: number,
        expiryDate: Date | null,
        dateOfManufacture: Date | null,
        detailId: string,
        batchNumber: string
    }>>>({});
    const [isDropdownVisible, setIsDropdownVisible] = useState(false);
    const [showMomoQR, setShowMomoQR] = useState<boolean>(false);
    const [totalBeforeDiscount, setTotalBeforeDiscount] = useState(0);
    const [totalDiscount, setTotalDiscount] = useState(0);
    const [discountPercent, setDiscountPercent] = useState(0);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [showBillModal, setShowBillModal] = useState(false);
    const [billData, setBillData] = useState<any>(null);
    const [showSuccess, setShowSuccess] = useState(false);
    const [momoPaymentUrl, setMomoPaymentUrl] = useState<string>('');
    const [isCreatingMomo, setIsCreatingMomo] = useState(false);

    // Hàm cập nhật số lượng sản phẩm đang bán và tổng kho
    const handleUpdateProductQuantities = async () => {
        try {
            if (!orderItems || orderItems.length === 0) {
                return;
            }

            // Lấy tất cả thông tin chi tiết sản phẩm hiện tại
            const response = await fetch(`/api/product-detail?t=${Date.now()}`);
            if (!response.ok) {
                throw new Error('Không thể lấy thông tin chi tiết sản phẩm');
            }

            const productDetails: IProductDetail[] = await response.json();

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
                const productId = orderItem.product._id;
                const quantityToDecrease = orderItem.quantity;
                const productName = orderItem.product?.name || `Sản phẩm #${productId}`;
                const batchDetailId = orderItem.batchDetails?.detailId;

                if (productDetailsMap[productId] && productDetailsMap[productId].length > 0) {
                    const details = productDetailsMap[productId];
                    let remainingQuantity = quantityToDecrease;

                    // Nếu có thông tin lô cụ thể, ưu tiên cập nhật lô đó trước
                    if (batchDetailId) {
                        const selectedBatch = details.find(d => d._id.toString() === batchDetailId);
                        if (selectedBatch) {
                            const currentInput = selectedBatch.input_quantity || 0;
                            const currentOutput = selectedBatch.output_quantity || 0;
                            const currentInventory = currentInput - currentOutput;

                            // Số lượng có thể bán từ lô này
                            const decreaseAmount = Math.min(remainingQuantity, currentInventory);

                            if (decreaseAmount > 0) {
                                // Tăng output_quantity (số lượng đã bán)
                                const newOutput = currentOutput + decreaseAmount;

                                try {
                                    const detailId = selectedBatch._id.toString();

                                    const updateResponse = await fetch(`/api/product-detail/${detailId}?t=${Date.now()}`, {
                                        method: 'PATCH',
                                        headers: {
                                            'Content-Type': 'application/json',
                                        },
                                        body: JSON.stringify({
                                            output_quantity: newOutput,
                                            user_id: employee,
                                            user_name: employeeName,
                                        }),
                                    });

                                    if (!updateResponse.ok) {
                                        const errorText = await updateResponse.text();
                                        throw new Error(`Không thể cập nhật chi tiết sản phẩm: ${updateResponse.status} ${updateResponse.statusText}`);
                                    }

                                    // Giảm số lượng còn phải xử lý
                                    remainingQuantity -= decreaseAmount;

                                } catch (updateError) {
                                    throw updateError;
                                }
                            }
                        }
                    }

                    // Nếu vẫn còn số lượng cần trừ, xử lý các lô khác
                    if (remainingQuantity > 0) {
                        // Sắp xếp lô theo ngày sản xuất để lấy lô cũ nhất trước
                        const sortedDetails = details.sort((a, b) => {
                            const dateA = a.date_of_manufacture ? new Date(a.date_of_manufacture).getTime() : 0;
                            const dateB = b.date_of_manufacture ? new Date(b.date_of_manufacture).getTime() : 0;
                            return dateA - dateB;
                        });

                        // Tiến hành xử lý từng chi tiết sản phẩm
                        for (const detail of sortedDetails) {
                            // Bỏ qua lô đã xử lý ở trên
                            if (batchDetailId && detail._id.toString() === batchDetailId) continue;

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
                                            user_id: employee,
                                            user_name: employeeName,
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
                    }
                }
            }
        } catch (error) {
            console.error('Lỗi khi cập nhật số lượng sản phẩm:', error);
            // Không hiển thị thông báo lỗi cho người dùng trong trường hợp này
            // vì đơn hàng đã được thanh toán thành công
            console.warn("Thanh toán vẫn thành công mặc dù có lỗi khi cập nhật số lượng sản phẩm");
        }
    };

    const totalAmount = orderItems.reduce((sum, item) => {
        const price = item.product.output_price;
        const quantity = item.quantity;
        let isDiscount = false;
        if (item.batchDetails?.expiryDate) {
            const now = new Date();
            const expiry = new Date(item.batchDetails.expiryDate);
            const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays <= 30) {
                isDiscount = true;
            }
        }
        if (isDiscount) {
            return sum + price * quantity * 0.5;
        } else {
            return sum + price * quantity;
        }
    }, 0);

    useEffect(() => {
        setCustomerPayment(totalAmount.toLocaleString());
    }, [totalAmount]);

    // Kiểm tra nếu có dữ liệu hóa đơn từ thanh toán MoMo
    // Hàm xử lý khi thanh toán MoMo thành công
    const handleMomoPaymentSuccess = useCallback(async () => {
        // Kiểm tra query param showBill từ callback MoMo
        const showBill = searchParams.get('showBill');

        // Kiểm tra localStorage có dữ liệu hóa đơn không
        const storedBillData = localStorage.getItem('show_bill_after_payment');

        if (showBill === 'true' && storedBillData) {
            try {
                const parsedBillData = JSON.parse(storedBillData);
                setBillData(parsedBillData);
                setShowBillModal(true);

                // Tạo đơn hàng từ dữ liệu MoMo
                const momoOrderDraft = localStorage.getItem('momo_order_draft');
                if (momoOrderDraft) {
                    const draftData = JSON.parse(momoOrderDraft);

                    // Gọi API để tạo đơn hàng
                    const response = await fetch(`/api/order?t=${Date.now()}`, {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            employee_id: draftData.employee_id,
                            items: draftData.items.map((item: any) => ({
                                product_id: item.product_id,
                                quantity: item.quantity,
                                price: item.price
                            })),
                            total_amount: draftData.total_amount,
                            payment_method: 'momo',
                            payment_status: true,
                            note: draftData.note,
                            status: 'completed'
                        }),
                    });

                    if (response.ok) {
                        // Cập nhật số lượng sản phẩm
                        await handleUpdateProductQuantities();

                        // Xóa dữ liệu đơn hàng nháp
                        localStorage.removeItem('momo_order_draft');
                    } else {
                        console.error('Lỗi khi tạo đơn hàng từ MoMo:', await response.text());
                    }
                }

                // Xóa dữ liệu sau khi đã hiển thị
                localStorage.removeItem('show_bill_after_payment');

                // Xóa query param và reset trạng thái
                const url = new URL(window.location.href);
                url.searchParams.delete('showBill');
                window.history.replaceState({}, '', url);

                // Reset form sau khi thanh toán thành công
                setOrderItems([]);
                setNote('');
                setPaymentMethod('cash');
                setDisplayPaymentText('Thanh toán tiền mặt');
                setShowMomoQR(false);
                setMomoPaymentUrl('');

                // Hiển thị thông báo thành công
                createNotification({
                    children: 'Thanh toán MoMo thành công! Đơn hàng đã được tạo.',
                    type: ENotificationType.SUCCESS,
                    isAutoClose: true,
                    id: Math.random(),
                });
            } catch (error) {
                console.error('Lỗi khi xử lý dữ liệu hóa đơn:', error);
            }
        }
    }, [searchParams, createNotification, handleUpdateProductQuantities]);

    // Kiểm tra khi component mount hoặc URL thay đổi
    useEffect(() => {
        handleMomoPaymentSuccess();
    }, [handleMomoPaymentSuccess]);

    useEffect(() => {
        const fetchEmployee = async () => {
            try {
                const response = await fetch('/api/auth/me');

                if (!response.ok) {
                    throw new Error('Failed to fetch employee');
                }
                const data = await response.json();
                console.log('Response status:', response.status);
                console.log('Full response data:', data);

                // Lấy account_id từ response đầu tiên
                const accountId = data._id;
                setEmployee(accountId);

                // Gọi API thứ hai để lấy thông tin chi tiết người dùng
                const userResponse = await fetch(`/api/user/account/${accountId}`);
                if (!userResponse.ok) {
                    throw new Error('Failed to fetch user details');
                }

                const userData = await userResponse.json();
                console.log('User data:', userData);

                // Tạo tên đầy đủ chỉ từ trường name vì model User chỉ có name
                const fullName = userData.name || '';

                setEmployeeName(fullName || 'Chưa xác định');
            } catch (err) {
                console.error('Error fetching employee:', err);
                setEmployee('Chưa xác định');
            }
        };

        fetchEmployee();
    }, []);

    // Lấy dữ liệu sản phẩm và inventory ban đầu
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                // Giới hạn số lượng sản phẩm tải về trong 1 request (50 là mặc định, có thể phân trang)
                const response = await fetch(`/api/product?limit=50&skip=0&t=${Date.now()}`);
                if (!response.ok) {
                    throw new Error('Failed to fetch products');
                }
                const data = await response.json();
                setProducts(data);
                setLoading(false);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Không thể tải danh sách sản phẩm');
                setLoading(false);
            }
        };

        fetchInitialData();
    }, []);

    // Lấy thông tin số lượng đang bán và hạn sử dụng của tất cả sản phẩm một lần duy nhất
    useEffect(() => {
        const fetchProductStockInfo = async () => {
            if (!products.length) return;

            try {
                const response = await fetch(`/api/product-detail?t=${Date.now()}`);
                if (response.ok) {
                    const allProductDetails: IProductDetail[] = await response.json();

                    // Group product details by product_id
                    const stockInfo: Record<string, Array<{
                        quantity: number,
                        expiryDate: Date | null,
                        dateOfManufacture: Date | null,
                        detailId: string,
                        batchNumber: string
                    }>> = {};

                    allProductDetails.forEach(detail => {
                        if (!stockInfo[detail.product_id]) {
                            stockInfo[detail.product_id] = [];
                        }

                        if (detail.inventory > 0) {
                            stockInfo[detail.product_id].push({
                                quantity: detail.inventory,
                                expiryDate: detail.expiry_date ? new Date(detail.expiry_date) : null,
                                dateOfManufacture: detail.date_of_manufacture ? new Date(detail.date_of_manufacture) : null,
                                detailId: detail._id,
                                batchNumber: detail.batch_number
                            });
                        }
                    });

                    // Sort each product's details by manufacturing date
                    Object.keys(stockInfo).forEach(productId => {
                        stockInfo[productId].sort((a, b) => {
                            if (!a.dateOfManufacture || !b.dateOfManufacture) return 0;
                            return a.dateOfManufacture.getTime() - b.dateOfManufacture.getTime();
                        });
                    });

                    setProductStockInfo(stockInfo);
                }
            } catch (error) {
                console.error('Lỗi khi lấy thông tin số lượng đang bán:', error);
            }
        };

        fetchProductStockInfo();
    }, [products]);

    // Lọc sản phẩm theo từ khóa tìm kiếm
    const filteredProducts = products.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const handleBack = () => {
        router.push('/home/order');
    };

    const handleAddToOrder = (product: IProduct, detailId?: string) => {
        const stockDetails = productStockInfo[product._id] || [];
        const totalAvailableQuantity = stockDetails.reduce((sum, detail) => {
            // Tổng số lượng = số lượng đang bán trên quầy + số lượng tồn kho (input_quantity - output_quantity)
            return sum + detail.quantity;
        }, 0);

        if (totalAvailableQuantity === 0) {
            alert(`Sản phẩm "${product.name}" đã hết hàng!`);
            return;
        }

        // Tìm chi tiết lô hàng nếu có detailId
        const selectedBatch = detailId ? stockDetails.find(detail => detail.detailId === detailId) : null;

        setOrderItems((prev) => {
            const existingItem = prev.find((item) => {
                if (detailId) {
                    return item.product._id === product._id && item.batchDetails?.detailId === detailId;
                }
                return item.product._id === product._id;
            });

            if (existingItem) {
                // Kiểm tra số lượng có sẵn trong lô cụ thể nếu có
                if (detailId && selectedBatch) {
                    if (existingItem.quantity >= selectedBatch.quantity) {
                        alert(`Lô hàng này chỉ còn ${selectedBatch.quantity} sản phẩm!`);
                        return prev;
                    }
                } else if (existingItem.quantity >= totalAvailableQuantity) {
                    alert(`Sản phẩm "${product.name}" chỉ còn ${totalAvailableQuantity} sản phẩm có sẵn!`);
                    return prev;
                }

                return prev.map((item) => {
                    if (item === existingItem) {
                        return { ...item, quantity: item.quantity + 1 };
                    }
                    return item;
                });
            }

            // Thêm mới sản phẩm với thông tin lô nếu có
            const newItem: OrderItem = {
                product,
                quantity: 1,
                ...(selectedBatch && {
                    batchDetails: {
                        detailId: selectedBatch.detailId,
                        dateOfManufacture: selectedBatch.dateOfManufacture,
                        expiryDate: selectedBatch.expiryDate
                    }
                })
            };

            return [...prev, newItem];
        });
    };

    const handlePaymentChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const value = e.target.value;
        setPaymentMethod(value);
        setDisplayPaymentText(
            value === 'cash' ? 'Thanh toán tiền mặt' :
                value === 'transfer' ? 'Chuyển khoản ngân hàng' :
                    value === 'momo' ? 'Ví MoMo' : ''
        );
        setShowMomoQR(false);
        setMomoPaymentUrl('');
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

    const handleCreateOrder = async () => {
        if (orderItems.length === 0) {
            createNotification({
                children: 'Vui lòng thêm sản phẩm vào đơn hàng',
                type: ENotificationType.ERROR,
                isAutoClose: true,
                id: Math.random(),
            });
            return;
        }

        setIsSubmitting(true);
        try {
            const response = await fetch(`/api/order?t=${Date.now()}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    employee_id: employee,
                    items: orderItems.map(item => ({
                        product_id: item.product._id,
                        quantity: item.quantity,
                        price: item.product.output_price
                    })),
                    total_amount: totalAmount,
                    payment_method: paymentMethod,
                    payment_status: true,
                    note: note,
                    customer_payment: parseInt(customerPayment.replace(/[^\d]/g, '')),
                    status: 'completed'
                }),
            });

            if (response.ok) {
                const orderData = await response.json();

                // Cập nhật số lượng sản phẩm đang bán và tổng kho
                await handleUpdateProductQuantities();

                // Tạo dữ liệu cho PDF/bill
                const pdfData = {
                    orderId: orderData._id,
                    employeeName: employeeName,
                    items: orderItems.map(item => ({
                        product: {
                            name: item.product.name,
                            output_price: item.product.output_price
                        },
                        quantity: item.quantity,
                        batchDetails: item.batchDetails
                    })),
                    totalAmount: totalAmount,
                    customerPayment: customerPayment,
                    changeAmount: changeAmount,
                    note: note
                };

                // Hiển thị modal bill thay vì chuyển trang
                setBillData(pdfData);
                setShowBillModal(true);
                setShowSuccess(true);

                // Nếu muốn in tự động, có thể gọi generatePDF(pdfData) ở đây hoặc trong modal
            } else {
                let errorMsg = 'Có lỗi xảy ra khi tạo đơn hàng';
                try {
                    const errorData = await response.json();
                    if (errorData && errorData.error) {
                        errorMsg = errorData.error;
                    }

                } catch (e) { }
                createNotification({
                    children: errorMsg,
                    type: ENotificationType.ERROR,
                    isAutoClose: true,
                    id: Math.random(),
                });
                return;
            }
        } catch (error) {
            console.error('Error creating order:', error);
            createNotification({
                children: error instanceof Error ? error.message : 'Có lỗi xảy ra khi tạo đơn hàng',
                type: ENotificationType.ERROR,
                isAutoClose: true,
                id: Math.random(),
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSaveDraft = async () => {
        if (orderItems.length === 0) {
            alert('Vui lòng thêm sản phẩm vào đơn hàng');
            return;
        }

        setIsSavingDraft(true);
        try {
            const response = await fetch(`/api/order?t=${Date.now()}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    employee_id: employee,
                    items: orderItems.map(item => ({
                        product_id: item.product._id,
                        quantity: item.quantity,
                        price: item.product.output_price
                    })),
                    total_amount: totalAmount,
                    payment_method: paymentMethod,
                    payment_status: false,
                    status: 'pending',
                    note: note
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Không thể lưu đơn hàng');
            }

            // Removing the product quantity update for draft orders
            // await updateProductQuantities();

            alert('Đã lưu đơn hàng nháp thành công!');
            setShowSuccess(true);
            router.push('/home/order');
        } catch (error) {
            console.error('Error saving draft:', error);
            alert(error instanceof Error ? error.message : 'Có lỗi xảy ra khi lưu đơn hàng nháp');
        } finally {
            setIsSavingDraft(false);
        }
    };

    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
        setIsDropdownVisible(true);
    };

    const handleProductFound = (productDetail: IProductDetail, product: any) => {
        // Tìm thấy sản phẩm qua barcode
        if (productDetail) {
            console.log('Tìm thấy thông tin sản phẩm chi tiết:', productDetail);

            // Tìm sản phẩm theo product_id từ productDetail
            const foundProduct = products.find(p => p._id === productDetail.product_id);

            if (foundProduct) {
                console.log('Tìm thấy sản phẩm:', foundProduct.name);
                handleAddToOrder(foundProduct, productDetail._id);
            } else {
                alert(`Không tìm thấy sản phẩm với mã: ${productDetail.batch_number}`);
            }
        } else {
            alert(`Không tìm thấy sản phẩm với mã vạch đã quét`);
        }
    };

    const handleBarcodeError = (message: string) => {
        // Hiển thị thông báo lỗi nếu cần
        console.error(message);
        alert(`Lỗi quét mã: ${message}`);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const searchContainer = document.getElementById('search-container');
            if (searchContainer && !searchContainer.contains(event.target as Node)) {
                setIsDropdownVisible(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);



    useEffect(() => {
        let beforeDiscount = 0;
        let afterDiscount = 0;
        let discount = 0;
        orderItems.forEach(item => {
            const price = item.product.output_price;
            const quantity = item.quantity;
            let isDiscount = false;
            let diffDays = null;
            if (item.batchDetails?.expiryDate) {
                const now = new Date();
                const expiry = new Date(item.batchDetails.expiryDate);
                diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                if (diffDays <= 30) {
                    isDiscount = true;
                }
            }
            if (isDiscount) {
                beforeDiscount += price * quantity;
                afterDiscount += price * quantity * 0.5;
            } else {
                beforeDiscount += price * quantity;
                afterDiscount += price * quantity;
            }
        });
        discount = beforeDiscount - afterDiscount;
        setTotalBeforeDiscount(beforeDiscount);
        setTotalDiscount(discount);
        setDiscountPercent(beforeDiscount > 0 ? Math.round((discount / beforeDiscount) * 100) : 0);
    }, [orderItems]);

    // Thêm hàm xử lý scroll để đảm bảo hiển thị đúng sản phẩm
    useEffect(() => {
        const handleScroll = () => {
            if (!dropdownRef.current) return;

            // Tìm tất cả các header sản phẩm trong dropdown
            const productHeaders = dropdownRef.current.querySelectorAll('.product-header');

            productHeaders.forEach((header) => {
                const rect = header.getBoundingClientRect();
                const dropdownRect = dropdownRef.current?.getBoundingClientRect();

                if (dropdownRect && rect.top <= dropdownRect.top) {
                    (header as HTMLElement).style.position = 'sticky';
                    (header as HTMLElement).style.top = '0';
                    (header as HTMLElement).style.zIndex = '10';
                } else {
                    (header as HTMLElement).style.position = 'relative';
                }
            });
        };

        const dropdown = dropdownRef.current;
        if (dropdown) {
            dropdown.addEventListener('scroll', handleScroll);
        }

        return () => {
            if (dropdown) {
                dropdown.removeEventListener('scroll', handleScroll);
            }
        };
    }, [isDropdownVisible]);

    const handleMoMoPayment = async () => {
        if (orderItems.length === 0) {
            createNotification({
                children: 'Vui lòng thêm sản phẩm vào đơn hàng',
                type: ENotificationType.ERROR,
                isAutoClose: true,
                id: Math.random(),
            });
            return;
        }

        setIsCreatingMomo(true);
        try {
            // Tạo mã đơn hàng có ý nghĩa
            const today = new Date();
            const dateStr = today.toLocaleDateString('vi-VN').split('/').join('');
            const timeStr = today.getTime().toString().slice(-6);
            const orderCode = `MOMO-${dateStr}-${timeStr}`;

            // Chuẩn bị dữ liệu đơn hàng
            const orderData = {
                employee_id: employee,
                items: orderItems.map(item => ({
                    product_id: item.product._id,
                    quantity: item.quantity,
                    price: item.product.output_price,
                    name: item.product.name,
                    // Thêm thông tin lô nếu có
                    batch_detail: item.batchDetails ? {
                        detail_id: item.batchDetails.detailId,
                        expiry_date: item.batchDetails.expiryDate,
                        date_of_manufacture: item.batchDetails.dateOfManufacture
                    } : null
                })),
                total_amount: totalAmount,
                payment_method: 'momo',
                payment_status: true,
                note: note,
                customer_payment: totalAmount,
                status: 'completed',
                order_code: orderCode,
                created_at: new Date(),
                employee_name: employeeName
            };

            // Lưu thông tin đơn hàng tạm vào localStorage
            localStorage.setItem('momo_order_draft', JSON.stringify(orderData));

            // Mã hóa dữ liệu đơn hàng thành base64 để truyền qua extraData
            const extraData = Buffer.from(JSON.stringify({
                employee_id: employee,
                items: orderItems.map(item => ({
                    product_id: item.product._id,
                    quantity: item.quantity,
                    price: item.product.output_price,
                    batch_detail: item.batchDetails ? {
                        detail_id: item.batchDetails.detailId
                    } : null
                }))
            })).toString('base64');

            const response = await fetch('/api/payment/momo', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    orderId: orderCode,
                    amount: totalAmount,
                    orderInfo: `Thanh toan don hang ${orderCode}`,
                    extraData: extraData
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || 'Không thể tạo thanh toán MoMo');
            }

            const data = await response.json();
            if (data.payUrl) {
                setMomoPaymentUrl(data.payUrl);
                setShowMomoQR(true);
                window.open(data.payUrl, '_blank');

                // Lưu thông tin đơn hàng vào localStorage để hiển thị sau khi thanh toán thành công
                const billData = {
                    orderCode: orderCode,
                    employeeName: employeeName,
                    items: orderItems.map(item => ({
                        product: {
                            name: item.product.name,
                            output_price: item.product.output_price
                        },
                        quantity: item.quantity,
                        batchDetails: item.batchDetails
                    })),
                    totalAmount: totalAmount,
                    customerPayment: totalAmount,
                    changeAmount: 0,
                    note: note,
                    paymentMethod: 'momo',
                    paymentTime: new Date()
                };
                localStorage.setItem('show_bill_after_payment', JSON.stringify(billData));

                createNotification({
                    children: 'Đã tạo thanh toán MoMo thành công! Vui lòng hoàn tất thanh toán.',
                    type: ENotificationType.INFO,
                    isAutoClose: true,
                    id: Math.random(),
                });
            } else {
                throw new Error(data.message || 'Không thể tạo thanh toán MoMo');
            }
        } catch (err) {
            console.error('Lỗi thanh toán MoMo:', err);
            createNotification({
                children: err instanceof Error ? err.message : 'Có lỗi khi tạo thanh toán MoMo',
                type: ENotificationType.ERROR,
                isAutoClose: true,
                id: Math.random(),
            });
        } finally {
            setIsCreatingMomo(false);
        }
    };

    // Hàm đóng modal hóa đơn
    const closeBillModal = () => {
        setShowBillModal(false);
        setBillData(null);
    };

    // Hàm in hóa đơn
    const printBill = () => {
        if (billData) {
            generatePDF(billData);
        }
    };

    return (
        <div className="min-h-screen bg-white pb-24">
            <div className="bg-white border-b border-slate-200 sticky top-0 z-40">
                <div className="max-w-[1500px] mx-auto">
                    <div className="flex items-center h-14 px-5">
                        <div className="flex items-center gap-2">
                            <Button
                                onClick={handleBack}
                                className="flex items-center gap-2 h-10 rounded-md bg-white border border-slate-200 hover:bg-slate-50 transition-all duration-200 shadow-sm px-4 min-w-0 w-auto"
                            >
                                <Image
                                    src="/icons/chevron-left.svg"
                                    alt="Back"
                                    width={16}
                                    height={16}
                                    className="text-slate-500"
                                />
                                <span className="text-base text-slate-700 font-medium">Quay lại</span>
                            </Button>
                            <span className="ml-5 text-lg font-medium text-slate-900 whitespace-nowrap flex items-center h-10">Tạo đơn hàng</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-[1500px] mx-auto p-5">
                <div className="grid grid-cols-7 gap-6">
                    {/* Cột trái - Sản phẩm đã chọn và tìm kiếm */}
                    <div className="col-span-4">
                        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-md h-[800px] flex flex-col">
                            <div className="flex flex-col mb-4 relative gap-3">
                                <h2 className="text-lg font-semibold mb-2">Quét mã vạch</h2>
                                <div className="flex items-center justify-between mb-3">
                                    <BarcodeScanner
                                        onProductFound={handleProductFound}
                                        onError={handleBarcodeError}
                                    />
                                </div>

                                <h2 className="text-lg font-semibold mb-2">Tìm kiếm sản phẩm</h2>
                                <div className="relative" id="search-container">
                                    <input
                                        type="text"
                                        value={searchTerm}
                                        onChange={handleSearchChange}
                                        placeholder="Tên sản phẩm..."
                                        className="w-full p-4 border border-gray-300 rounded-xl text-lg h-14"
                                        onFocus={() => setIsDropdownVisible(true)}
                                    />
                                    {isDropdownVisible && searchTerm.length > 0 && filteredProducts.length > 0 && (
                                        <div
                                            ref={dropdownRef}
                                            className="absolute z-20 mt-2 bg-white border border-gray-200 rounded-xl shadow-lg w-full max-h-[400px] overflow-y-auto custom-scrollbar"
                                        >
                                            {filteredProducts.map(product => {
                                                const stockDetails = productStockInfo[product._id] || [];
                                                const totalStock = stockDetails.reduce((sum, detail) => sum + detail.quantity, 0);
                                                if (totalStock <= 0) return null;
                                                return (
                                                    <div key={product._id} className="mb-2">
                                                        <div className="px-4 py-3 bg-blue-50 rounded-t-xl flex justify-between items-center sticky top-0 z-10 product-header">
                                                            <div>
                                                                <div className="font-bold text-lg text-slate-900">{product.name}</div>
                                                                <div className="text-base text-green-700 font-bold mt-1">Giá: {formatCurrency(product.output_price)}</div>
                                                            </div>
                                                            <div className="text-green-600 font-semibold text-base">Tổng: {totalStock}</div>
                                                        </div>
                                                        {stockDetails.map(detail => (
                                                            <div
                                                                key={detail.detailId}
                                                                className="px-4 py-3 border-b border-gray-100 bg-white hover:bg-blue-100 cursor-pointer transition-all"
                                                                onClick={() => {
                                                                    handleAddToOrder(product, detail.detailId);
                                                                    setSearchTerm('');
                                                                    setIsDropdownVisible(false);
                                                                }}
                                                            >
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex flex-col items-start gap-1">
                                                                        <div className="flex items-center gap-2">
                                                                            <DynamicReactBarcode
                                                                                value={detail.batchNumber}
                                                                                height={30}
                                                                                width={1.5}
                                                                                fontSize={13}
                                                                                displayValue={true}
                                                                                margin={0}
                                                                            />
                                                                        </div>
                                                                        <div className="text-sm text-gray-500">
                                                                            NSX: {detail.dateOfManufacture ? new Date(detail.dateOfManufacture).toLocaleDateString('vi-VN') : 'Không có'}
                                                                        </div>
                                                                        <div className="text-sm text-gray-500">
                                                                            HSD: {detail.expiryDate ? new Date(detail.expiryDate).toLocaleDateString('vi-VN') : 'Không có'}
                                                                        </div>
                                                                    </div>
                                                                    <div className="text-green-600 font-bold text-lg">SL: {detail.quantity}</div>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <h2 className="text-xl font-semibold text-slate-900 mb-5 flex items-center gap-2">
                                <Image
                                    src="/icons/cart.svg"
                                    alt="cart"
                                    width={22}
                                    height={22}
                                    className="text-slate-700"
                                    priority
                                />
                                Sản phẩm đã chọn
                            </h2>

                            {orderItems.length > 0 ? (
                                <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-3">
                                    {orderItems.map((item, index) => {
                                        let isDiscount = false;
                                        let diffDays = null;
                                        if (item.batchDetails?.expiryDate) {
                                            const now = new Date();
                                            const expiry = new Date(item.batchDetails.expiryDate);
                                            diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                                            if (diffDays <= 30) {
                                                isDiscount = true;
                                            }
                                        }
                                        return (
                                            <div
                                                key={`${item.product._id}-${item.batchDetails?.detailId || index}`}
                                                className="flex items-center gap-4 p-4 border border-slate-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 transition-all duration-200"
                                            >
                                                <div className="w-16 h-16 bg-slate-50 rounded-xl relative overflow-hidden flex-shrink-0">
                                                    {item.product.image_links?.[0] ? (
                                                        <Image
                                                            src={item.product.image_links[0]}
                                                            alt={item.product.name}
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
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium text-lg text-slate-900 truncate">{item.product.name}</span>
                                                        {isDiscount && (
                                                            <span className="ml-2 px-2 py-0.5 bg-white border border-red-500 text-red-600 text-xs rounded font-bold animate-pulse">Giảm 50%</span>
                                                        )}
                                                    </div>
                                                    {item.batchDetails && (
                                                        <div className="mt-1 space-y-1">
                                                            <div className="text-lg text-slate-500">
                                                                NSX: {item.batchDetails.dateOfManufacture ? new Date(item.batchDetails.dateOfManufacture).toLocaleDateString('vi-VN') : 'Không có'}
                                                            </div>
                                                            <div className="text-lg text-slate-500">
                                                                HSD: {item.batchDetails.expiryDate ? new Date(item.batchDetails.expiryDate).toLocaleDateString('vi-VN') : 'Không có'}
                                                            </div>
                                                        </div>
                                                    )}
                                                    <div className="mt-1 text-lg font-medium text-slate-500">
                                                        Giá : {formatCurrency(item.product.output_price)}
                                                    </div>
                                                </div>
                                                <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();

                                                            if (item.quantity > 1) {
                                                                setOrderItems(prev =>
                                                                    prev.map(i =>
                                                                        i === item
                                                                            ? { ...i, quantity: i.quantity - 1 }
                                                                            : i
                                                                    )
                                                                );
                                                            } else {
                                                                setOrderItems(prev =>
                                                                    prev.filter(i => i !== item)
                                                                );
                                                            }
                                                        }}
                                                        className="w-10 h-10 flex items-center justify-center hover:bg-slate-100 transition-colors"
                                                    >
                                                        <Image
                                                            src="/icons/minus.svg"
                                                            alt="minus"
                                                            width={18}
                                                            height={18}
                                                            className="text-slate-600"
                                                        />
                                                    </button>
                                                    <div className="w-14 h-10 flex items-center justify-center border-l border-r border-slate-200 text-lg text-black font-medium">
                                                        {item.quantity}
                                                    </div>
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            const stockDetails = productStockInfo[item.product._id] || [];

                                                            if (item.batchDetails) {
                                                                const batch = stockDetails.find(d => d.detailId === item.batchDetails?.detailId);
                                                                if (batch && item.quantity >= batch.quantity) {
                                                                    alert(`Lô hàng này chỉ còn ${batch.quantity} sản phẩm!`);
                                                                    return;
                                                                }
                                                            } else {
                                                                const totalAvailable = stockDetails.reduce((sum, detail) => sum + detail.quantity, 0);
                                                                if (item.quantity >= totalAvailable) {
                                                                    alert(`Sản phẩm "${item.product.name}" chỉ còn ${totalAvailable} sản phẩm có sẵn!`);
                                                                    return;
                                                                }
                                                            }

                                                            setOrderItems(prev =>
                                                                prev.map(i =>
                                                                    i === item
                                                                        ? { ...i, quantity: i.quantity + 1 }
                                                                        : i
                                                                )
                                                            );
                                                        }}
                                                        className="w-10 h-10 flex items-center justify-center hover:bg-slate-100 transition-colors"
                                                    >
                                                        <Image
                                                            src="/icons/plus.svg"
                                                            alt="plus"
                                                            width={18}
                                                            height={18}
                                                            className="text-slate-600"
                                                        />
                                                    </button>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-medium text-slate-900">
                                                        {formatCurrency((isDiscount ? item.product.output_price * 0.5 : item.product.output_price) * item.quantity)}
                                                    </div>
                                                </div>
                                                <button
                                                    onClick={() =>
                                                        setOrderItems((prev) =>
                                                            prev.filter((i) => i !== item)
                                                        )
                                                    }
                                                    className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-red-50 transition-colors"
                                                >
                                                    <Image
                                                        src="/icons/trash.svg"
                                                        alt="remove"
                                                        width={20}
                                                        height={20}
                                                        className="text-red-500"
                                                    />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="flex-1 flex flex-col items-center justify-center py-16">
                                    <div className="text-center mt-4">
                                        <Image
                                            src="/icons/empty-cart.svg"
                                            alt="empty"
                                            width={60}
                                            height={60}
                                            className="mx-auto mb-4 text-slate-400"
                                            priority
                                        />
                                        <p className="text-slate-600 mb-2 text-lg">Chưa có sản phẩm nào được chọn</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Cột phải - Thanh toán */}
                    <div className="col-span-3">
                        <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-md h-[800px] flex flex-col w-full">
                            <h2 className="text-xl font-semibold text-slate-900 mb-5 flex items-center gap-2">
                                <Image
                                    src="/icons/order.svg"
                                    alt="payment"
                                    width={22}
                                    height={22}
                                    className="text-slate-700"
                                    priority
                                />
                                Thanh toán
                            </h2>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                    <span className="text-slate-700 text-lg">Tổng tiền hàng</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-slate-500 text-lg">{orderItems.length} sản phẩm</span>
                                        <span className="text-slate-900 font-medium text-lg">
                                            {formatCurrency(totalAmount)}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                    <span className="text-slate-700 text-lg">Giảm giá</span>
                                    <div className="flex items-center gap-2">
                                        {totalDiscount > 0 && (
                                            <span className="text-slate-500 text-lg line-through">{formatCurrency(totalBeforeDiscount)}</span>
                                        )}
                                        <span className="text-slate-900 font-medium text-lg">{formatCurrency(totalDiscount)}</span>
                                        {discountPercent > 0 && (
                                            <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-600 text-xs rounded font-semibold">-{discountPercent}%</span>
                                        )}
                                    </div>
                                </div>
                                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                                    <span className="text-slate-700 text-lg">Phí giao hàng</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-slate-500 text-lg">---</span>
                                        <span className="text-slate-900 font-medium text-lg">0đ</span>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center py-1">
                                    <span className="font-semibold text-slate-900 text-xl">Thành tiền</span>
                                    <div className="flex items-center gap-2">
                                        <span className="text-slate-900 text-2xl font-semibold">
                                            {formatCurrency(totalAmount)}
                                        </span>
                                    </div>
                                </div>

                                {/* Phần thanh toán */}
                                <div className="mt-4 bg-gray-50 border border-slate-200 rounded-xl p-5 w-full overflow-hidden">
                                    <div className="grid grid-cols-5 gap-3 mb-4">
                                        <div className="col-span-2">
                                            <label className="block text-lg text-slate-600 mb-1.5">
                                                Hình thức thanh toán
                                            </label>
                                            <select
                                                className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-900"
                                                value={paymentMethod}
                                                onChange={handlePaymentChange}
                                            >
                                                <option value="cash">Thanh toán tiền mặt</option>
                                                <option value="transfer">Chuyển khoản ngân hàng</option>
                                                <option value="momo">Ví MoMo</option>
                                            </select>


                                        </div>
                                        <div className="col-span-3">
                                            <label className="block text-lg text-slate-600 mb-1.5">
                                                Số tiền khách đưa
                                            </label>
                                            <div className="flex items-center gap-2 w-full">
                                                <input
                                                    type="text"
                                                    className="w-full px-4 py-3 bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-900"
                                                    value={customerPayment}
                                                    onChange={handlePaymentAmountChange}
                                                    placeholder="0"
                                                />
                                                <span className="text-green-600 font-bold text-lg">đ</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-lg text-slate-600 mb-1.5">
                                            Số tiền khách phải trả
                                        </label>
                                        <span className="w-full block px-5 py-4 bg-gray-100 border border-slate-200 rounded-lg text-green-600 font-bold text-lg text-left">
                                            {changeAmount}
                                        </span>
                                    </div>

                                    <div>
                                        <label className="block text-lg text-slate-600 mb-1.5">
                                            Nhân viên phụ trách
                                        </label>
                                        <span className="w-full block px-4 py-4 bg-gray-100 border border-slate-200 rounded-lg text-slate-900 font-bold text-lg text-left">
                                            {employeeName}
                                        </span>
                                    </div>

                                    <div>
                                        <label className="block text-lg text-slate-600 mb-1.5">
                                            Ghi chú
                                        </label>
                                        <textarea
                                            value={note}
                                            onChange={(e) => setNote(e.target.value)}
                                            placeholder="VD: Giao hàng trong giờ hành chính cho khách"
                                            className="w-full px-5 py-4 bg-white border border-slate-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 min-h-[80px] resize-none text-slate-900 placeholder:text-slate-400 text-lg"
                                        ></textarea>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 shadow-lg">
                <div className="max-w-[1500px] mx-auto px-6 py-5">
                    <div className="flex items-center justify-end gap-5">
                        <Button
                            onClick={handleSaveDraft}
                            isDisable={isSavingDraft}
                            className="px-7 py-3 bg-slate-50 border border-slate-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 font-medium text-lg text-slate-700 transition-all duration-200 hover:shadow-sm flex items-center gap-2"
                        >
                            <Image
                                src="/icons/save.svg"
                                alt="save"
                                width={20}
                                height={20}
                                className="text-slate-600"
                                priority
                            />
                            {isSavingDraft ? 'Đang lưu...' : 'Lưu nháp'}
                        </Button>
                        <Button
                            onClick={paymentMethod === 'momo' ? handleMoMoPayment : handleCreateOrder}
                            isDisable={isSubmitting || isCreatingMomo}
                            className={`h-12 px-7 ${paymentMethod === 'momo'
                                ? 'bg-pink-600 hover:bg-pink-700 text-black hover:text-white-600 border-2 border-slate-200 hover:border-blue-500 text-slate-900 '
                                : 'bg-white hover:bg-blue-50 border-2 border-slate-200 hover:border-blue-500 text-slate-900 hover:text-blue-600'
                                } rounded-lg font-medium text-lg shadow-sm transition-all duration-200 flex items-center gap-2`}
                        >
                            {paymentMethod === 'momo' ? (
                                <>
                                    <Image
                                        src="/images/momo-logo.png"
                                        alt="momo"
                                        width={22}
                                        height={22}
                                        className="text-black"
                                        priority
                                    />
                                    {isCreatingMomo ? 'Đang tạo...' : 'Thanh toán với MoMo'}
                                    {momoPaymentUrl && (
                                        <div className="mt-2">
                                            <a href={momoPaymentUrl} target="_blank" rel="noopener noreferrer" className="text-pink-600 underline">
                                                Mở lại trang thanh toán MoMo
                                            </a>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <>
                                    <Image
                                        src="/icons/check.svg"
                                        alt="check"
                                        width={22}
                                        height={22}
                                        className="text-slate-900"
                                        priority
                                    />
                                    {isSubmitting ? 'Đang xử lý...' : 'Tạo đơn hàng'}
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>

            {showMomoQR && (
                <div className="bg-pink-50 border border-pink-200 rounded-lg mt-2 p-3">
                    <div className="text-center mb-2">
                        <p className="text-lg font-medium text-pink-700">Quét mã MoMo để thanh toán</p>
                        <p className="text-xs text-pink-600 mt-1">Số tiền: {formatCurrency(totalAmount)}</p>
                    </div>
                    <div className="flex justify-center">
                        <div className="bg-white p-3 rounded-lg border border-pink-200 shadow-sm">
                            <div className="w-48 h-48 relative">
                                <Image
                                    src="/images/qr_momo.jpg"
                                    alt="Mã QR MoMo"
                                    fill
                                    className="object-contain"
                                    priority
                                />
                            </div>
                        </div>
                    </div>

                </div>
            )}

            {showBillModal && billData && (
                <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-10 w-[480px] max-h-[95vh] overflow-y-auto relative print:w-full print:max-w-full print:rounded-none print:p-2 border font-sans text-lg">
                        <button
                            className="absolute top-4 right-4 text-2xl print:hidden"
                            onClick={closeBillModal}
                        >×</button>
                        <div className="text-center mb-3">
                            <div className="font-bold text-lg">CỬA HÀNG BÁN LẺ</div>
                            <div className="text-lg">www.cuahangbanle.com</div>
                            <div className="text-lg">32/37 Đường Lê Thị Hồng,</div>
                            <div className="text-lg mb-1">Phường 17, Quận Gò Vấp, TP HCM</div>
                        </div>
                        <div className="text-center font-bold text-2xl my-3">PHIẾU THANH TOÁN</div>
                        <div className="mb-1 text-lg">SỐ CT: <span className="font-mono">{billData.orderCode}</span></div>
                        <div className="mb-1 text-lg">Ngày CT: {new Date(billData.paymentTime || new Date()).toLocaleDateString('vi-VN')} {new Date(billData.paymentTime || new Date()).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}</div>
                        <div className="mb-1 text-lg">Nhân viên: {billData.employeeName}</div>
                        {billData.momoTransId && (
                            <div className="mb-1 text-lg">Mã giao dịch MoMo: <span className="font-mono">{billData.momoTransId}</span></div>
                        )}
                        <div className="border-t border-dashed border-black my-3"></div>
                        <table className="w-full text-lg mb-3">
                            <thead>
                                <tr className="border-b border-dashed border-black">
                                    <th className="text-left font-bold">Sản phẩm</th>
                                    <th className="font-bold">SL</th>
                                    <th className="font-bold">Giá</th>
                                    <th className="font-bold">Giảm giá</th>
                                    <th className="text-right font-bold">T.Tiền</th>
                                </tr>
                            </thead>
                            <tbody>
                                {billData.items.map((item: any, idx: number) => {
                                    let isDiscount = false;
                                    let discountText = '0';
                                    let price = item.product.output_price;
                                    let total = price * item.quantity;
                                    if (item.batchDetails && item.batchDetails.expiryDate) {
                                        const now = new Date();
                                        const expiry = new Date(item.batchDetails.expiryDate);
                                        const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                                        if (diffDays <= 30) {
                                            isDiscount = true;
                                            discountText = '50%';
                                            price = price * 0.5;
                                            total = price * item.quantity;
                                        }
                                    }
                                    return (
                                        <tr key={idx}>
                                            <td className="align-top">{item.product.name}</td>
                                            <td className="align-top text-center">{item.quantity}</td>
                                            <td className="align-top text-right">
                                                {isDiscount ? (
                                                    <>
                                                        <span className="line-through text-gray-400 mr-1">{formatCurrency(item.product.output_price)}</span>
                                                        <span className="text-red-600 font-bold">{formatCurrency(price)}</span>
                                                    </>
                                                ) : (
                                                    <span>{formatCurrency(item.product.output_price)}</span>
                                                )}
                                            </td>
                                            <td className="align-top text-center">{discountText}</td>
                                            <td className="align-top text-right">{formatCurrency(total)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                        <div className="border-t border-dashed border-black my-3"></div>
                        <div className="flex flex-col gap-1 text-lg">
                            <div className="flex justify-between"><span className="font-bold">Thành tiền:</span><span className="font-bold">{formatCurrency(billData.totalAmount)} </span></div>
                            <div className="flex justify-between"><span className="font-bold">Thanh toán:</span><span className="font-bold">{billData.paymentMethod === 'momo' ? 'Ví MoMo' : 'Tiền mặt'} </span></div>
                            <div className="flex justify-between"><span className="font-bold">Tiền khách đưa:</span><span className="font-bold">{formatCurrency(billData.customerPayment)} </span></div>
                            <div className="flex justify-between"><span className="font-bold">Tiền thối lại:</span><span className="font-bold">{formatCurrency(billData.changeAmount || 0)} </span></div>
                        </div>
                        <div className="border-t border-dashed border-black my-3"></div>
                        <div className="text-lg text-center mt-2">
                            (Giá trên đã bao gồm thuế GTGT)<br />
                            Lưu ý: Cửa hàng chỉ xuất hóa đơn trong ngày.<br />
                            Quý khách vui lòng liên hệ thu ngân để được hỗ trợ.
                        </div>
                        <div className="flex justify-center mt-6 print:hidden">
                            <Button
                                onClick={printBill}
                                className="bg-blue-700 border border-blue-700 text-yellow-300 px-8 py-3 rounded-lg text-lg font-bold uppercase tracking-wider hover:bg-blue-800 hover:border-blue-800"
                            >
                                In hóa đơn
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {showSuccess && (
                <CustomNotification type={ENotificationType.SUCCESS} isAutoClose={true} onDelete={() => setShowSuccess(false)}>
                    Tạo đơn hàng thành công!
                </CustomNotification>
            )}
            {notificationElements}
        </div>
    );
} 