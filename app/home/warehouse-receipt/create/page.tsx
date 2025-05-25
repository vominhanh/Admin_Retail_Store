/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useCallback, useEffect, useState, ChangeEvent } from "react";
import { Button, NumberInput, SelectDropdown, Text } from "@/components";
import InputSection from "../../components/input-section/input-section";
import { EButtonType } from "@/components/button/interfaces/button-type.interface";
import { useQuery, QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { IWarehouseReceipt } from "@/interfaces/warehouse-receipt.interface";
import { IOrderForm, IOrderFormProductDetail, OrderFormStatus } from "@/interfaces/order-form.interface";
import { ISelectOption } from "@/components/select-dropdown/interfaces/select-option.interface";
import { IProduct } from "@/interfaces/product.interface";
import { IBusiness } from "@/interfaces/business.interface";
import { IUnit } from "@/interfaces/unit.interface";
import { DEFAULT_WAREHOUSE_RECEIPT } from "@/constants/warehouse-receipt.constant";
import { DEFAULT_ORDER_FORM } from "@/constants/order-form.constant";
import { fetchGetCollections } from "@/utils/fetch-get-collections";
import { generateBatchNumber } from "@/utils/batch-number";
import BarcodeComponent from "@/components/barcode/barcode";
import dynamic from "next/dynamic";
import useNotificationsHook from "@/hooks/notifications-hook";
import { ENotificationType } from "@/components/notify/notification/notification";
import { addCollection, updateOrderStatus } from "@/services/api-service";
import { ECollectionNames } from "@/enums";
import { EStatusCode } from "@/enums/status-code.enum";
import { useRouter } from 'next/navigation';

const DynamicReactBarcode = dynamic(() => import("react-barcode"), { ssr: false });

const collectionName: ECollectionNames = ECollectionNames.WAREHOUSE_RECEIPT;

const formatCurrency = (value: number | string): string => {
    const numericValue = typeof value === 'string' ? Number(value.replace(/\./g, '')) : value;
    if (isNaN(numericValue)) return '';
    return numericValue.toLocaleString('vi-VN');
};
const parseCurrency = (value: string): number => {
    const numericValue = value.replace(/\./g, '');
    return Number(numericValue);
};

const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 5 * 60 * 1000,
            refetchOnWindowFocus: false,
            retry: 1,
        },
    },
});

function CreateWarehouseReceiptPage() {
    const { createNotification } = useNotificationsHook();
    const queryClient = useQueryClient();
    const router = useRouter();

    const [warehouseReceipt, setWarehouseReceipt] = useState<IWarehouseReceipt>(DEFAULT_WAREHOUSE_RECEIPT);
    const [orderForm, setOrderForm] = useState<IOrderForm>(DEFAULT_ORDER_FORM);
    const [orderFormOptions, setOrderFormOptions] = useState<ISelectOption[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    // Query data
    const { data: products = [], isLoading: isLoadingProducts } = useQuery({
        queryKey: ['products'],
        queryFn: () => fetchGetCollections<IProduct>(ECollectionNames.PRODUCT),
    });
    const { data: units = [], isLoading: isLoadingUnits } = useQuery({
        queryKey: ['units'],
        queryFn: () => fetchGetCollections<IUnit>(ECollectionNames.UNIT),
    });
    const { data: businesses = [], isLoading: isLoadingBusinesses } = useQuery({
        queryKey: ['businesses'],
        queryFn: () => fetchGetCollections<IBusiness>(ECollectionNames.BUSINESS),
    });
    const { data: orderForms = [], isLoading: isLoadingOrderForms } = useQuery({
        queryKey: ['warehouse-receipt'],
        queryFn: async () => {
            try {
                const allOrderForms = await fetchGetCollections<IOrderForm>(ECollectionNames.ORDER_FORM);
                const allWarehouseReceipts = await fetchGetCollections<IWarehouseReceipt>(ECollectionNames.WAREHOUSE_RECEIPT);
                const usedOrderFormIds = allWarehouseReceipts.map(receipt => receipt.supplier_receipt_id);
                const pendingOrderForms = allOrderForms.filter(form => form.status === OrderFormStatus.PENDING);
                const markedOrderForms = pendingOrderForms.map(form => ({
                    ...form,
                    isUsed: usedOrderFormIds.includes(form._id)
                }));
                const sortedOrderForms = markedOrderForms.sort((a, b) => {
                    if (a.isUsed === b.isUsed) return 0;
                    return a.isUsed ? 1 : -1;
                });
                return sortedOrderForms;
            } catch {
                return [];
            }
        },
        enabled: businesses.length > 0,
    });

    useEffect(() => {
        if (orderForms.length > 0) {
            const newOrderFormOptions = orderForms.map(form => ({
                label: `${form._id.slice(-6)} - ${new Date(form.created_at).toLocaleDateString('vi-VN')}${form.isUsed ? ' (Đã sử dụng)' : ''}`,
                value: form._id,
                disabled: form.isUsed
            }));
            setOrderFormOptions(newOrderFormOptions);
            const currentOrderFormExists = orderForms.some(form => form._id === orderForm._id);
            if (!currentOrderFormExists || !orderForm._id) {
                const firstOrderForm = orderForms[0];
                setOrderForm(firstOrderForm);
                setWarehouseReceipt(prev => ({
                    ...prev,
                    supplier_id: firstOrderForm.supplier_id,
                    supplier_receipt_id: firstOrderForm._id,
                    product_details: firstOrderForm.product_details.map(detail => ({
                        ...detail,
                        date_of_manufacture: '',
                        expiry_date: '',
                        batch_number: generateBatchNumber(detail._id),
                        note: '',
                        input_price: detail.input_price ?? 0
                    }))
                }));
            }
        } else if (orderFormOptions.length > 0) {
            setOrderFormOptions([]);
            setOrderForm(DEFAULT_ORDER_FORM);
            setWarehouseReceipt(DEFAULT_WAREHOUSE_RECEIPT);
        }
    }, [orderForms]);

    // Tự động tạo số lô khi khởi tạo
    useEffect(() => {
        if (warehouseReceipt.product_details && warehouseReceipt.product_details.length > 0) {
            setWarehouseReceipt(prev => {
                const newProductDetails = prev.product_details.map(detail => {
                    if (!detail.batch_number) {
                        return {
                            ...detail,
                            batch_number: generateBatchNumber(detail._id)
                        };
                    }
                    return detail;
                });
                return {
                    ...prev,
                    product_details: newProductDetails
                };
            });
        }
    }, []);

    const productOptions = React.useMemo(() => {
        if (products.length === 0) return [];
        return products.map(product => ({
            label: product.name || '',
            value: product._id
        }));
    }, [products]);
    const unitOptions = React.useMemo(() =>
        units.map(unit => ({
            label: unit.name,
            value: unit._id
        })), [units]);

    // Xử lý thay đổi số lượng, giá, ghi chú, NSX, HSD
    const handleChangeWarehouseReceiptProductQuantity = useCallback((e: ChangeEvent<HTMLInputElement>, index: number): void => {
        const newQuantity = parseInt(e.target.value);
        if (isNaN(newQuantity) || newQuantity < 1) return;
        setWarehouseReceipt(prev => {
            const newProductDetails = [...prev.product_details];
            newProductDetails[index] = {
                ...newProductDetails[index],
                quantity: newQuantity
            };
            return {
                ...prev,
                product_details: newProductDetails
            };
        });
    }, []);

    // Lưu phiếu nhập kho
    const handleSaveClick = useCallback(async () => {
        if (isSaving) return;
        if (!warehouseReceipt.supplier_receipt_id || !warehouseReceipt.supplier_id) {
            createNotification({
                children: 'Không tìm thấy thông tin phiếu đặt hàng hoặc nhà cung cấp!',
                type: ENotificationType.ERROR,
                isAutoClose: true,
                id: Math.random()
            });
            return;
        }
        const orderFormExists = orderForms.some(form => form._id === warehouseReceipt.supplier_receipt_id);
        if (!orderFormExists) {
            createNotification({
                children: 'Phiếu đặt hàng này đã được sử dụng hoặc không tồn tại!',
                type: ENotificationType.ERROR,
                isAutoClose: true,
                id: Math.random()
            });
            return;
        }
        if (!warehouseReceipt.product_details || warehouseReceipt.product_details.length === 0) {
            createNotification({
                children: 'Không có sản phẩm nào trong phiếu nhập kho!',
                type: ENotificationType.ERROR,
                isAutoClose: true,
                id: Math.random()
            });
            return;
        }
        const fixedProductDetails = warehouseReceipt.product_details.map(detail => {
            const batchNumber = detail.batch_number || generateBatchNumber(detail._id);
            let inputPrice = 0;
            if (typeof detail.input_price === 'number') {
                inputPrice = detail.input_price;
            } else if (typeof detail.input_price === 'string') {
                const numericString = String(detail.input_price).replace(/[^\d]/g, '');
                inputPrice = numericString ? parseInt(numericString) : 0;
            }
            let quantity = 0;
            if (typeof detail.quantity === 'number') {
                quantity = detail.quantity;
            } else if (typeof detail.quantity === 'string') {
                quantity = parseInt(detail.quantity) || 0;
            }
            return {
                ...detail,
                batch_number: batchNumber,
                input_price: inputPrice,
                quantity: quantity
            };
        });
        setWarehouseReceipt(prev => ({
            ...prev,
            product_details: fixedProductDetails
        }));
        const invalidQuantity = fixedProductDetails.some(detail => !detail.quantity || detail.quantity <= 0);
        if (invalidQuantity) {
            createNotification({
                children: 'Số lượng sản phẩm không được để trống hoặc nhỏ hơn 1',
                type: ENotificationType.WARNING,
                isAutoClose: true
            });
            return;
        }
        const invalidPrice = fixedProductDetails.some(detail => !detail.input_price || detail.input_price <= 0);
        if (invalidPrice) {
            createNotification({
                children: 'Giá nhập không được để trống hoặc nhỏ hơn 1',
                type: ENotificationType.WARNING,
                isAutoClose: true
            });
            return;
        }
        const missingDates = fixedProductDetails.some(detail => !detail.date_of_manufacture || !detail.expiry_date);
        if (missingDates) {
            createNotification({
                children: 'Ngày sản xuất và hạn sử dụng không được để trống',
                type: ENotificationType.WARNING,
                isAutoClose: true
            });
            return;
        }
        // Kiểm tra ngày sản xuất phải nhỏ hơn ngày hiện tại
        const now = new Date();
        const invalidMfgDate = fixedProductDetails.some(detail => {
            if (!detail.date_of_manufacture) return false;
            const mfgDate = new Date(detail.date_of_manufacture as string);
            mfgDate.setHours(0, 0, 0, 0);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return mfgDate >= today;
        });
        if (invalidMfgDate) {
            createNotification({
                children: 'Ngày sản xuất (NSX) phải nhỏ hơn ngày hiện tại!',
                type: ENotificationType.WARNING,
                isAutoClose: true
            });
            return;
        }
        const invalidDates = fixedProductDetails.some(detail => {
            if (!detail.date_of_manufacture || !detail.expiry_date) return false;
            const mfgDate = new Date(detail.date_of_manufacture as string);
            const expDate = new Date(detail.expiry_date as string);
            mfgDate.setHours(0, 0, 0, 0);
            expDate.setHours(0, 0, 0, 0);
            return mfgDate >= expDate;
        });
        if (invalidDates) {
            createNotification({
                children: 'Ngày hết hạn phải lớn hơn ngày sản xuất',
                type: ENotificationType.WARNING,
                isAutoClose: true
            });
            return;
        }
        // Lấy tên user đăng nhập
        let userName = '';
        try {
            // Lấy accountId từ API auth/me
            const res = await fetch('/api/auth/me');
            if (res.ok) {
                const data = await res.json();
                const accountId = data._id;
                // Lấy thông tin user từ accountId
                const userRes = await fetch(`/api/user/account/${accountId}`);
                if (userRes.ok) {
                    const userData = await userRes.json();
                    userName = userData.name || '';
                }
            }
        } catch { }
        if (!userName) {
            createNotification({
                children: 'Không xác định được người dùng, vui lòng đăng nhập lại!',
                type: ENotificationType.ERROR,
                isAutoClose: true,
                id: Math.random(),
            });
            setIsSaving(false);
            return;
        }
        try {
            setIsSaving(true);
            const response = await addCollection({
                ...warehouseReceipt,
                user_name: userName,
            }, collectionName);
            if (response.status === EStatusCode.OK || response.status === EStatusCode.CREATED) {
                // Sau khi nhập kho thành công, kiểm tra cập nhật giá và lưu lịch sử giá
                // Lấy danh sách sản phẩm hiện tại
                const productsRes = await fetch('/api/product');
                const products = productsRes.ok ? await productsRes.json() : [];
                for (const detail of warehouseReceipt.product_details) {
                    const product = products.find((p: any) => p._id === detail._id);
                    if (product && product.input_price !== detail.input_price) {
                        await fetch('/api/price-history', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                product_id: detail._id,
                                old_input_price: product.input_price,
                                new_input_price: detail.input_price,
                                old_output_price: product.output_price,
                                new_output_price: product.output_price,
                                changed_at: new Date(),
                                user_name: userName,
                                note: 'Cập nhật giá khi nhập kho',
                            })
                        });
                    }
                }
                await updateOrderStatus(warehouseReceipt.supplier_receipt_id, OrderFormStatus.COMPLETED);
                createNotification({
                    children: 'Tạo phiếu nhập kho thành công!',
                    type: ENotificationType.SUCCESS,
                    isAutoClose: true,
                    id: Math.random(),
                });
                setOrderForm(DEFAULT_ORDER_FORM);
                setWarehouseReceipt(DEFAULT_WAREHOUSE_RECEIPT);
                return;
            } else {
                let errorMessage = 'Không thể lưu phiếu nhập kho';
                try {
                    const errorData = await response.json();
                    if (errorData && errorData.message) {
                        errorMessage = errorData.message;
                    }
                } catch { }
                throw new Error(errorMessage);
            }
        } catch (error) {
            createNotification({
                children: error instanceof Error ? error.message : 'Không thể lưu phiếu nhập kho',
                type: ENotificationType.ERROR,
                isAutoClose: true,
                id: Math.random(),
            });
        } finally {
            setIsSaving(false);
        }
    }, [warehouseReceipt, isSaving, orderForms, queryClient, router]);

    return (
        <div className="max-w-9xl mx-auto py-10">
            <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl p-10 mb-10">
                <div className="mb-6">
                    <div className="grid grid-cols-2 gap-10">
                        <InputSection label="Chọn phiếu đặt hàng" gridColumns="180px 1fr">
                            <SelectDropdown
                                isLoading={isLoadingProducts || isLoadingUnits || isLoadingBusinesses || isLoadingOrderForms}
                                isDisable={isSaving}
                                options={orderFormOptions}
                                defaultOptionIndex={orderFormOptions.findIndex(option => option.value === orderForm._id)}
                                onInputChange={(e): void => {
                                    const selectedForm = orderForms.find(form => form._id === e.target.value);
                                    if (selectedForm) {
                                        setOrderForm(selectedForm);
                                        setWarehouseReceipt(prev => ({
                                            ...prev,
                                            supplier_id: selectedForm.supplier_id,
                                            supplier_receipt_id: selectedForm._id,
                                            product_details: selectedForm.product_details.map(detail => ({
                                                ...detail,
                                                date_of_manufacture: '',
                                                expiry_date: '',
                                                batch_number: generateBatchNumber(detail._id),
                                                note: '',
                                                input_price: detail.input_price ?? 0
                                            }))
                                        }));
                                    }
                                }}
                                className="border-blue-300 hover:border-blue-500 focus:border-blue-600 text-md px-4 py-3 rounded-xl shadow-sm"
                            />
                        </InputSection>
                        <InputSection label="Nhà cung cấp" gridColumns="180px 1fr">
                            <Text className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 min-h-[46px] flex items-center text-md font-semibold">
                                {businesses.find(b => b._id === orderForm.supplier_id)?.name || 'Không có lựa chọn'}
                            </Text>
                        </InputSection>
                    </div>
                    <div className="mt-6">
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <div className="bg-blue-100 rounded-t-lg py-2 text-center">
                                    <div className="inline-flex items-center justify-center text-blue-700 font-bold">
                                        PHIẾU ĐẶT HÀNG
                                    </div>
                                </div>
                                <div className="grid grid-cols-5 bg-blue-500 p-2 font-bold text-center text-white" style={{ gridTemplateColumns: "30px 1fr 1fr 1fr 1fr" }}>
                                    <div className="flex justify-center items-center">#</div>
                                    <div className="flex justify-center items-center">Tên sản phẩm</div>
                                    <div className="flex justify-center items-center">Đơn vị tính</div>
                                    <div className="flex justify-center items-center">Số lượng</div>
                                    <div className="flex justify-center items-center">Giá</div>
                                </div>
                            </div>
                            <div>
                                <div className="bg-green-100 rounded-t-lg py-2 text-center">
                                    <div className="inline-flex items-center justify-center text-green-700 font-bold">
                                        PHIẾU NHẬP KHO
                                    </div>
                                </div>
                                <div className="grid grid-cols-7 bg-green-500 p-2 font-bold text-center text-white">
                                    <div className="flex justify-center items-center">Tên sản phẩm</div>
                                    <div className="flex justify-center items-center">Đơn vị tính</div>
                                    <div className="flex justify-center items-center">Số lượng</div>
                                    <div className="flex justify-center items-center">NSX</div>
                                    <div className="flex justify-center items-center">HSD</div>
                                    <div className="flex justify-center items-center">Giá</div>
                                    <div className="flex justify-center items-center">Ghi chú</div>
                                </div>
                            </div>
                        </div>
                        {orderForm && orderForm.product_details && orderForm.product_details.map((orderFormProductDetail: IOrderFormProductDetail, index: number) => {
                            const warehouseProductDetail = warehouseReceipt.product_details[index];
                            return (
                                <div key={index} className="grid grid-cols-2 gap-6 border-b border-gray-100 py-3 hover:bg-gray-50 transition-all items-center relative">
                                    <div className="grid grid-cols-5 items-center gap-1" style={{ gridTemplateColumns: "30px 1fr 1fr 1fr 1fr" }}>
                                        <div className="text-center font-bold text-gray-700">{index + 1}</div>
                                        <div className="flex justify-center items-center">
                                            <SelectDropdown
                                                isLoading={isLoadingProducts}
                                                isDisable={true}
                                                options={productOptions}
                                                defaultOptionIndex={productOptions.findIndex(option => option.value === orderFormProductDetail._id)}
                                                className="bg-gray-50 border border-gray-200 rounded-lg w-full"
                                            />
                                        </div>
                                        <div className="flex justify-center items-center">
                                            <SelectDropdown
                                                isLoading={isLoadingUnits}
                                                isDisable={true}
                                                options={unitOptions}
                                                defaultOptionIndex={unitOptions.findIndex(option => option.value === orderFormProductDetail.unit_id)}
                                                className="bg-gray-50 border border-gray-200 rounded-lg w-full"
                                            />
                                        </div>
                                        <div className="flex justify-center items-center">
                                            <NumberInput
                                                min={1}
                                                max={100}
                                                name={`quantity`}
                                                isDisable={true}
                                                value={orderFormProductDetail.quantity + ""}
                                                className="bg-gray-200 border border-gray-200 rounded-lg text-center font-bold w-full"
                                            />
                                        </div>
                                        <div className="text-center text-blue-700 font-bold">{orderFormProductDetail.input_price ? orderFormProductDetail.input_price.toLocaleString('vi-VN') : ''}</div>
                                    </div>
                                    <div className="grid grid-cols-7 items-center gap-1">
                                        <div className="flex justify-center items-center">
                                            <SelectDropdown
                                                isLoading={isLoadingProducts}
                                                isDisable={true}
                                                options={productOptions}
                                                defaultOptionIndex={productOptions.findIndex(option => option.value === warehouseProductDetail?._id)}
                                                className="bg-gray-50 border border-gray-200 rounded-lg w-full"
                                            />
                                        </div>
                                        <div className="flex justify-center items-center">
                                            <SelectDropdown
                                                isLoading={isLoadingUnits}
                                                isDisable={true}
                                                options={unitOptions}
                                                defaultOptionIndex={unitOptions.findIndex(option => option.value === warehouseProductDetail?.unit_id)}
                                                className="bg-gray-50 border border-gray-200 rounded-lg w-full"
                                            />
                                        </div>
                                        <div className="flex justify-center items-center relative">
                                            <NumberInput
                                                min={1}
                                                max={100}
                                                name={`quantity`}
                                                isDisable={isSaving}
                                                value={warehouseProductDetail?.quantity + ''}
                                                onInputChange={(e): void => handleChangeWarehouseReceiptProductQuantity(e, index)}
                                                className="border-green-300 hover:border-green-500 focus:border-green-600 rounded-lg text-center font-bold w-full"
                                            />
                                            {(!warehouseProductDetail?.quantity || warehouseProductDetail?.quantity <= 0) && (
                                                <div className="absolute -top-2 -right-1">
                                                    <span className="bg-red-500 text-white text-xs font-medium rounded-full w-4 h-4 flex items-center justify-center" title="Bắt buộc">!</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex justify-center items-center relative">
                                            <input
                                                type="date"
                                                name={`date_of_manufacture`}
                                                disabled={isSaving}
                                                value={warehouseProductDetail?.date_of_manufacture || ''}
                                                onChange={(e: ChangeEvent<HTMLInputElement>): void => {
                                                    setWarehouseReceipt(prev => {
                                                        const newProductDetails = [...prev.product_details];
                                                        newProductDetails[index] = {
                                                            ...newProductDetails[index],
                                                            date_of_manufacture: e.target.value,
                                                            batch_number: newProductDetails[index].batch_number || generateBatchNumber(newProductDetails[index]._id)
                                                        };
                                                        return {
                                                            ...prev,
                                                            product_details: newProductDetails
                                                        };
                                                    });
                                                }}
                                                className="border border-gray-200 rounded-lg py-1 text-center focus:border-green-400 w-full"
                                                style={{ minWidth: '110px' }}
                                                placeholder="dd/mm/yyyy"
                                            />
                                            {!warehouseProductDetail?.date_of_manufacture && (
                                                <div className="absolute -top-2 -right-1">
                                                    <span className="bg-red-500 text-white text-xs font-medium rounded-full w-4 h-4 flex items-center justify-center" title="Bắt buộc">!</span>
                                                </div>
                                            )}
                                            {warehouseProductDetail?.date_of_manufacture &&
                                                (() => {
                                                    const mfgDate = new Date(warehouseProductDetail.date_of_manufacture as string);
                                                    const today = new Date();
                                                    mfgDate.setHours(0, 0, 0, 0);
                                                    today.setHours(0, 0, 0, 0);
                                                    return mfgDate >= today;
                                                })() && (
                                                    <div className="absolute -bottom-14 left-0 right-0">
                                                        <span className="bg-red-100 text-red-700 text-xs font-medium py-1 px-2 rounded-lg w-full block text-center">
                                                            NSX phải nhỏ hơn ngày hiện tại
                                                        </span>
                                                    </div>
                                                )}
                                        </div>
                                        <div className="flex justify-center items-center relative">
                                            <input
                                                type="date"
                                                name={`expiry_date`}
                                                disabled={isSaving}
                                                value={warehouseProductDetail?.expiry_date || ''}
                                                onChange={(e: ChangeEvent<HTMLInputElement>): void => {
                                                    setWarehouseReceipt(prev => {
                                                        const newProductDetails = [...prev.product_details];
                                                        newProductDetails[index] = {
                                                            ...newProductDetails[index],
                                                            expiry_date: e.target.value
                                                        };
                                                        return {
                                                            ...prev,
                                                            product_details: newProductDetails
                                                        };
                                                    });
                                                }}
                                                className="border border-gray-200 rounded-lg py-1 text-center focus:border-green-400 w-full"
                                                style={{ minWidth: '110px' }}
                                                placeholder="dd/mm/yyyy"
                                            />
                                            {!warehouseProductDetail?.expiry_date && (
                                                <div className="absolute -top-2 -right-1">
                                                    <span className="bg-red-500 text-white text-xs font-medium rounded-full w-4 h-4 flex items-center justify-center" title="Bắt buộc">!</span>
                                                </div>
                                            )}
                                            {warehouseProductDetail?.date_of_manufacture && warehouseProductDetail?.expiry_date &&
                                                new Date(warehouseProductDetail.date_of_manufacture) >= new Date(warehouseProductDetail.expiry_date) && (
                                                    <div className="absolute -bottom-10 left-0 right-0">
                                                        <span className="bg-red-100 text-red-700 text-xs font-medium py-1 px-2 rounded-lg w-full block text-center">
                                                            HSD phải lớn hơn NSX
                                                        </span>
                                                    </div>
                                                )}
                                        </div>
                                        <div className="flex justify-center items-center relative">
                                            <input
                                                type="text"
                                                name={`input_price`}
                                                disabled={isSaving}
                                                value={warehouseProductDetail?.input_price ? formatCurrency(warehouseProductDetail.input_price) : ''}
                                                onChange={(e: ChangeEvent<HTMLInputElement>): void => {
                                                    const numericValue = parseCurrency(e.target.value);
                                                    if (isNaN(numericValue) && e.target.value !== '') return;
                                                    setWarehouseReceipt(prev => {
                                                        const newProductDetails = [...prev.product_details];
                                                        newProductDetails[index] = {
                                                            ...newProductDetails[index],
                                                            input_price: numericValue
                                                        };
                                                        return {
                                                            ...prev,
                                                            product_details: newProductDetails
                                                        };
                                                    });
                                                }}
                                                className="border border-gray-200 rounded-lg py-1 text-center focus:border-green-400 font-bold w-full"
                                                placeholder="Nhập giá..."
                                            />
                                            {(!warehouseProductDetail?.input_price || warehouseProductDetail?.input_price <= 0) && (
                                                <div className="absolute -top-2 -right-1">
                                                    <span className="bg-red-500 text-white text-xs font-medium rounded-full w-4 h-4 flex items-center justify-center" title="Bắt buộc">!</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex justify-center items-center">
                                            <input
                                                type="text"
                                                name="note"
                                                disabled={isSaving}
                                                value={warehouseProductDetail?.note || ''}
                                                onChange={(e: ChangeEvent<HTMLInputElement>): void => {
                                                    setWarehouseReceipt(prev => {
                                                        const newProductDetails = [...prev.product_details];
                                                        newProductDetails[index] = {
                                                            ...newProductDetails[index],
                                                            note: e.target.value
                                                        };
                                                        return {
                                                            ...prev,
                                                            product_details: newProductDetails
                                                        };
                                                    });
                                                }}
                                                className="border border-gray-200 rounded-lg py-1 w-full text-center"
                                                placeholder="Ghi chú..."
                                            />
                                        </div>
                                    </div>
                                    <div className="col-span-2 mt-2 grid grid-cols-2 gap-4">
                                        <div className="flex flex-col">
                                            <label className="text-sm font-medium text-gray-700 mb-1" style={{ paddingLeft: 35, paddingRight: 5 }}>Số lô</label>
                                            <div style={{ paddingLeft: 35, paddingRight: 5 }}>
                                                <BarcodeComponent
                                                    productId={warehouseProductDetail?._id || ''}
                                                    value={warehouseProductDetail?.batch_number || ''}
                                                    onChange={(value: string) => {
                                                        setWarehouseReceipt(prev => {
                                                            const newProductDetails = [...prev.product_details];
                                                            newProductDetails[index] = {
                                                                ...newProductDetails[index],
                                                                batch_number: value
                                                            };
                                                            return {
                                                                ...prev,
                                                                product_details: newProductDetails
                                                            };
                                                        });
                                                    }}
                                                />
                                            </div>
                                        </div>
                                        <div className="flex flex-col">
                                            <label className="text-sm font-medium text-gray-700 mb-1">Mã vạch</label>
                                            <div className="border border-gray-200 rounded-lg py-2 px-3 bg-gray-50 h-[50px] flex items-center justify-center">
                                                {warehouseProductDetail?.batch_number ? (
                                                    <div className="w-full flex justify-left">
                                                        <DynamicReactBarcode
                                                            value={warehouseProductDetail.batch_number}
                                                            height={40}
                                                            width={1.5}
                                                            fontSize={10}
                                                            displayValue={true}
                                                            margin={0}
                                                        />
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-500 text-sm italic">Chưa có số lô</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
                <div className="flex justify-end mt-8">
                    <Button
                        type={EButtonType.SUCCESS}
                        isLoading={isSaving}
                        onClick={handleSaveClick}
                        className="px-8 py-3 font-bold text-lg rounded-xl shadow-md hover:shadow-lg transition-all"
                    >
                        Lưu phiếu nhập kho
                    </Button>
                </div>
            </div>
        </div>
    );
}

export default function CreateWarehouseReceiptProvider() {
    return (
        <QueryClientProvider client={queryClient}>
            <CreateWarehouseReceiptPage />
        </QueryClientProvider>
    );
} 