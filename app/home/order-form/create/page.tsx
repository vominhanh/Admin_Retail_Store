/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable react/no-unescaped-entities */
/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { Button, IconContainer, NumberInput, SelectDropdown, Text } from '@/components'
import { EButtonType } from '@/components/button/interfaces/button-type.interface';
import { ENotificationType } from '@/components/notify/notification/notification';
import TabItem from '@/components/tabs/components/tab-item/tab-item';
import Tabs from '@/components/tabs/tabs';
import { ISelectOption } from '@/components/select-dropdown/interfaces/select-option.interface';
import { DEFAULT_ORDER_FORM } from '@/constants/order-form.constant';
import useNotificationsHook from '@/hooks/notifications-hook';
import { IOrderForm, IOrderFormProductDetail, OrderFormStatus } from '@/interfaces/order-form.interface';
import { IUnit } from '@/interfaces/unit.interface';
import { plusIcon, trashIcon, infoIcon } from '@/public';
import { ECollectionNames, EStatusCode } from '@/enums';
import { fetchBusinessNames, fetchProductsBySupplier } from '@/utils/fetch-helpers';
import { fetchGetCollections } from '@/utils/fetch-get-collections';
import { formatCurrency } from '@/utils/format-currency';
import { getSelectedOptionIndex } from '@/components/select-dropdown/utils/get-selected-option-index';
import { IExtendedSelectOption } from '@/interfaces/extended-select-option.interface';
import { addCollection } from '@/services/api-service';
import InputSection from '../../components/input-section/input-section';
import { useCallback, useEffect, useState, ChangeEvent, ReactElement } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../style.module.css';

export default function CreateOrderForm() {
    const router = useRouter();
    const { createNotification, notificationElements } = useNotificationsHook();
    const [orderForm, setOrderForm] = useState<IOrderForm>(DEFAULT_ORDER_FORM);
    const [isProductLoading, setIsProductLoading] = useState<boolean>(true);
    const [isBusinessLoading, setIsBusinessLoading] = useState<boolean>(true);
    const [isUnitLoading, setIsUnitLoading] = useState<boolean>(true);
    const [productOptions, setProductOptions] = useState<IExtendedSelectOption[]>([]);
    const [filteredProductOptions, setFilteredProductOptions] = useState<IExtendedSelectOption[]>([]);
    const [businessOptions, setBusinessOptions] = useState<ISelectOption[]>([]);
    const [unitOptions, setUnitOptions] = useState<ISelectOption[]>([]);
    const [isSaving, setIsSaving] = useState<boolean>(false);
    const [dataFetched, setDataFetched] = useState<boolean>(false);

    // Tối ưu lại việc lấy dữ liệu ban đầu
    useEffect(() => {
        // Chỉ fetch dữ liệu một lần
        if (dataFetched) return;

        const fetchInitialData = async () => {
            try {
                // Lấy danh sách nhà cung cấp
                setIsBusinessLoading(true);
                const businessList = await fetchBusinessNames();
                setBusinessOptions(businessList);

                // Lấy đơn vị tính
                setIsUnitLoading(true);
                const newUnits: IUnit[] = await fetchGetCollections<IUnit>(ECollectionNames.UNIT);
                setUnitOptions(
                    newUnits.map((unit: IUnit): ISelectOption => ({
                        label: `${unit.name}`,
                        value: unit._id,
                    }))
                );
                setIsUnitLoading(false);

                // Cài đặt nhà cung cấp đầu tiên
                if (businessList.length > 0) {
                    const supplierId = businessList[0].value;
                    setOrderForm(prev => ({
                        ...prev,
                        supplier_id: supplierId
                    }));

                    // Lấy sản phẩm cho nhà cung cấp đã chọn
                    setIsProductLoading(true);
                    const productsList = await fetchProductsBySupplier(supplierId);
                    setProductOptions(productsList);
                    setFilteredProductOptions(productsList);
                    setIsProductLoading(false);
                }

                setIsBusinessLoading(false);
                setDataFetched(true);
            } catch (error) {
                console.error("Lỗi khi tải dữ liệu ban đầu:", error);
                createNotification({
                    id: 1,
                    children: <Text>Đã xảy ra lỗi khi tải dữ liệu. Vui lòng làm mới trang.</Text>,
                    type: ENotificationType.ERROR,
                    isAutoClose: true,
                });
                setIsBusinessLoading(false);
                setIsUnitLoading(false);
                setIsProductLoading(false);
            }
        };

        fetchInitialData();
    }, [createNotification, dataFetched]);

    // Thay đổi nhà cung cấp
    const handleChangeBusinessId = useCallback((e: ChangeEvent<HTMLSelectElement>): void => {
        const newBusinessId = e.target.value;

        // Reset sản phẩm đã chọn
        setOrderForm(prevOrderForm => ({
            ...prevOrderForm,
            supplier_id: newBusinessId,
            product_details: [],
        }));

        // Tải sản phẩm cho nhà cung cấp mới
        const fetchProducts = async () => {
            try {
                setIsProductLoading(true);
                const products = await fetchProductsBySupplier(newBusinessId);
                setProductOptions(products);
                setFilteredProductOptions(products);
                setIsProductLoading(false);
            } catch (error) {
                console.error("Lỗi khi lấy sản phẩm theo nhà cung cấp:", error);
                setIsProductLoading(false);
                createNotification({
                    id: 2,
                    children: <Text>Không thể lấy danh sách sản phẩm. Vui lòng thử lại.</Text>,
                    type: ENotificationType.ERROR,
                    isAutoClose: true,
                });
            }
        };

        fetchProducts();
    }, [createNotification]);

    // Thêm sản phẩm vào phiếu đặt hàng
    const handleAddOrderFormProduct = useCallback(() => {
        if (filteredProductOptions.length === 0) {
            createNotification({
                id: 0,
                children: <Text>Không có sản phẩm nào của nhà cung cấp này</Text>,
                type: ENotificationType.ERROR,
                isAutoClose: true,
            });
            return;
        }

        setOrderForm(prevOrderForm => {
            if (prevOrderForm.product_details.length >= filteredProductOptions.length) {
                createNotification({
                    id: 0,
                    children: <Text>Đã thêm tất cả sản phẩm của nhà cung cấp này vào phiếu đặt hàng</Text>,
                    type: ENotificationType.ERROR,
                    isAutoClose: true,
                });
                return prevOrderForm;
            }

            // Tìm sản phẩm chưa được thêm vào
            const availableProducts = filteredProductOptions.filter(
                option => !prevOrderForm.product_details.some(detail => detail._id === option.value)
            );

            if (availableProducts.length === 0) {
                createNotification({
                    id: 0,
                    children: <Text>Đã thêm tất cả sản phẩm của nhà cung cấp này vào phiếu đặt hàng</Text>,
                    type: ENotificationType.ERROR,
                    isAutoClose: true,
                });
                return prevOrderForm;
            }

            // Lấy sản phẩm đầu tiên chưa được thêm vào
            const productToAdd = {
                _id: availableProducts[0].value, // ID của product - đây là ID sản phẩm
                unit_id: unitOptions.length > 0 ? unitOptions[0].value : '',
                quantity: 1,
                input_price: 0, // Luôn mặc định là 0 để bắt buộc người dùng nhập
            };

            return {
                ...prevOrderForm,
                product_details: [
                    ...prevOrderForm.product_details,
                    productToAdd
                ],
            };
        });
    }, [filteredProductOptions, unitOptions, createNotification]);

    // Xóa sản phẩm khỏi phiếu đặt hàng
    const handleDeleteOrderFormProduct = useCallback((deleteIndex: number) => {
        setOrderForm(prevOrderForm => ({
            ...prevOrderForm,
            product_details: [
                ...prevOrderForm.product_details.filter((
                    _orderFormProductDetail: IOrderFormProductDetail,
                    index: number
                ): boolean => index !== deleteIndex),
            ],
        }));
    }, []);

    // Thay đổi sản phẩm
    const handleChangeOrderFormProductId = useCallback((
        e: ChangeEvent<HTMLSelectElement>,
        changeIndex: number,
    ): void => {
        setOrderForm(prevOrderForm => ({
            ...prevOrderForm,
            product_details: [
                ...prevOrderForm.product_details.map((
                    orderFormProductDetail: IOrderFormProductDetail,
                    index: number
                ): IOrderFormProductDetail => {
                    if (index === changeIndex)
                        return {
                            ...orderFormProductDetail,
                            _id: e.target.value
                        }
                    else
                        return orderFormProductDetail;
                }),
            ],
        }));
    }, []);

    // Thay đổi đơn vị tính
    const handleChangeOrderFormProductUnitId = useCallback((
        e: ChangeEvent<HTMLSelectElement>,
        changeIndex: number,
    ): void => {
        setOrderForm(prevOrderForm => ({
            ...prevOrderForm,
            product_details: [
                ...prevOrderForm.product_details.map((
                    orderFormProductDetail: IOrderFormProductDetail,
                    index: number
                ): IOrderFormProductDetail => {
                    if (index === changeIndex)
                        return {
                            ...orderFormProductDetail,
                            unit_id: e.target.value
                        }
                    else
                        return orderFormProductDetail;
                }),
            ],
        }));
    }, []);

    // Thay đổi số lượng
    const handleChangeOrderFormProductQuantity = useCallback((
        e: ChangeEvent<HTMLInputElement>,
        changeIndex: number,
    ): void => {
        setOrderForm(prevOrderForm => ({
            ...prevOrderForm,
            product_details: [
                ...prevOrderForm.product_details.map((
                    orderFormProductDetail: IOrderFormProductDetail,
                    index: number
                ): IOrderFormProductDetail => {
                    if (index === changeIndex)
                        return {
                            ...orderFormProductDetail,
                            quantity: +e.target.value
                        }
                    else
                        return orderFormProductDetail;
                }),
            ],
        }));
    }, []);

    // Thay đổi giá nhập
    const handleChangeOrderFormProductInputPrice = useCallback((
        e: ChangeEvent<HTMLInputElement>,
        changeIndex: number,
    ): void => {
        try {
            // Xử lý giá trị nhập vào - loại bỏ tất cả dấu chấm và ký tự không phải số
            const rawValue = e.target.value.replace(/\./g, '').replace(/,/g, '').replace(/\D/g, '');

            // Chuyển đổi thành số - nếu rỗng thì gán là 0
            let numericValue = rawValue === '' ? 0 : Number(rawValue);

            // Giới hạn số tối đa là 9999999
            if (numericValue > 9999999) {
                numericValue = 9999999;
                createNotification({
                    id: 1,
                    children: <Text>Giá trị không được vượt quá 9.999.999</Text>,
                    type: ENotificationType.WARNING,
                    isAutoClose: true,
                });
            }

            // Gán giá trị vào form
            setOrderForm(prevOrderForm => ({
                ...prevOrderForm,
                product_details: [
                    ...prevOrderForm.product_details.map((
                        orderFormProductDetail: IOrderFormProductDetail,
                        index: number
                    ): IOrderFormProductDetail => {
                        if (index === changeIndex)
                            return {
                                ...orderFormProductDetail,
                                input_price: numericValue
                            }
                        else
                            return orderFormProductDetail;
                    }),
                ],
            }));
        } catch (error) {
            console.error("Lỗi xử lý giá nhập:", error);
        }
    }, [createNotification]);

    // Định dạng giá tiền
    const formatInputPrice = (value: number | undefined): string => {
        if (value === undefined || value === null || value === 0) return "";
        try {
            // Format số với dấu chấm phân cách hàng nghìn theo chuẩn Việt Nam (1.000.000)
            return value.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
        } catch (error) {
            console.error("Lỗi định dạng giá:", error);
            return value.toString();
        }
    };

    // Lưu phiếu đặt hàng
    const handleSaveClick = useCallback(async () => {
        if (isSaving) return;

        if (!orderForm.supplier_id) {
            createNotification({
                id: 0,
                children: <Text>Vui lòng chọn nhà cung cấp</Text>,
                type: ENotificationType.ERROR,
                isAutoClose: true,
            });
            return;
        }

        if (!orderForm.product_details || orderForm.product_details.length === 0) {
            createNotification({
                id: 0,
                children: <Text>Vui lòng thêm sản phẩm vào phiếu đặt hàng</Text>,
                type: ENotificationType.ERROR,
                isAutoClose: true,
            });
            return;
        }

        const invalidQuantity = orderForm.product_details.some(detail => !detail.quantity || detail.quantity <= 0);
        if (invalidQuantity) {
            createNotification({
                id: 0,
                children: <Text>Vui lòng nhập số lượng hợp lệ cho tất cả sản phẩm</Text>,
                type: ENotificationType.ERROR,
                isAutoClose: true,
            });
            return;
        }

        const invalidPrice = orderForm.product_details.some(detail => !detail.input_price || detail.input_price <= 0);
        if (invalidPrice) {
            const zeroPrice = orderForm.product_details.find(detail => detail.input_price === 0);
            const emptyPrice = orderForm.product_details.find(detail => !detail.input_price);

            if (zeroPrice || emptyPrice) {
                const productWithIssue = zeroPrice || emptyPrice;
                const productName = filteredProductOptions.find(option => option.value === productWithIssue?._id)?.label || 'sản phẩm';

                createNotification({
                    id: 0,
                    children: <Text>Vui lòng nhập giá cho sản phẩm {productName}</Text>,
                    type: ENotificationType.ERROR,
                    isAutoClose: true,
                });
            } else {
                createNotification({
                    id: 0,
                    children: <Text>Vui lòng nhập giá nhập lớn hơn 0 cho tất cả sản phẩm</Text>,
                    type: ENotificationType.ERROR,
                    isAutoClose: true,
                });
            }
            return;
        }

        try {
            setIsSaving(true);

            // Tạo phiếu đặt hàng mới
            const response = await addCollection(orderForm, ECollectionNames.ORDER_FORM);

            if (response.ok || response.status === EStatusCode.OK || response.status === EStatusCode.CREATED) {
                // Reset form nhưng giữ lại supplier_id
                setOrderForm({
                    ...DEFAULT_ORDER_FORM,
                    supplier_id: orderForm.supplier_id,
                });

                createNotification({
                    id: 0,
                    children: <Text>Tạo phiếu đặt hàng thành công</Text>,
                    type: ENotificationType.SUCCESS,
                    isAutoClose: true,
                });

                // Chuyển đến trang danh sách phiếu đặt hàng
                // setTimeout(() => {
                //     router.push('/home/order-form');
                // }, 1500);
            } else {
                const errorData = await response.json();
                console.error('Error response:', errorData);

                if (errorData?.details?.includes('giá nhập') ||
                    errorData?.message?.includes('giá nhập') ||
                    errorData?.message?.includes('input price') ||
                    errorData?.details?.includes('input price')) {
                    createNotification({
                        id: 0,
                        children: <Text>Vui lòng nhập giá cho tất cả sản phẩm</Text>,
                        type: ENotificationType.ERROR,
                        isAutoClose: true,
                    });
                } else {
                    throw new Error(errorData?.message || 'Failed to save order form');
                }
            }
        } catch (error) {
            console.error('Error saving order form:', error);

            let errorMessage = 'Có lỗi xảy ra khi lưu phiếu đặt hàng';

            if (error instanceof Error) {
                if (error.message.includes('giá nhập') || error.message.includes('input price')) {
                    errorMessage = 'Vui lòng nhập giá cho tất cả sản phẩm';
                } else if (error.message.includes('số lượng') || error.message.includes('quantity')) {
                    errorMessage = 'Vui lòng nhập số lượng hợp lệ cho tất cả sản phẩm';
                }
            }

            createNotification({
                id: 0,
                children: <Text>{errorMessage}</Text>,
                type: ENotificationType.ERROR,
                isAutoClose: true,
            });
        } finally {
            setIsSaving(false);
        }
    }, [orderForm, isSaving, router, createNotification, filteredProductOptions]);

    return (
        <div className="flex flex-col w-full h-full">
            <div className="bg-white rounded-lg p-6 shadow-lg mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Thêm phiếu đặt hàng</h1>
                </div>
                <div className="flex gap-4">
                    <button className="text-gray-700" onClick={() => router.back()}>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6 flex-grow">
                <Tabs>
                    <TabItem label={`Phiếu đặt hàng`}>
                        <div className="space-y-6">
                            <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
                                <label className="text-gray-700 font-medium min-w-[120px]">Nhà cung cấp</label>
                                <div className="flex-grow">
                                    <SelectDropdown
                                        className="w-full bg-white border border-gray-300 hover:border-blue-400 rounded"
                                        isLoading={isBusinessLoading}
                                        options={businessOptions}
                                        defaultOptionIndex={getSelectedOptionIndex(
                                            businessOptions,
                                            (orderForm.supplier_id
                                                ? orderForm.supplier_id
                                                : 0
                                            ) as unknown as string
                                        )}
                                        onInputChange={handleChangeBusinessId}
                                    />
                                </div>
                            </div>

                            <div className="w-full">
                                <div className="grid items-center grid-cols-[60px_2fr_1fr_1fr_1fr_80px] bg-blue-500 py-3 px-4 rounded-lg font-medium shadow-md text-white">
                                    <Text className="font-bold text-center">#</Text>
                                    <Text className="font-bold text-center">Tên sản phẩm</Text>
                                    <Text className="font-bold text-center">Giá nhập (đ)</Text>
                                    <Text className="font-bold text-center">Đơn vị tính</Text>
                                    <Text className="font-bold text-center">Số lượng</Text>
                                    <Text className="font-bold text-center">Thao tác</Text>
                                </div>

                                {filteredProductOptions.length === 0 && orderForm.supplier_id && !isProductLoading && (
                                    <div className="text-center py-10 bg-yellow-50 rounded-lg border border-dashed border-yellow-300 mb-4 shadow-inner mt-3">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="bg-yellow-100 p-3 rounded-full">
                                                <IconContainer iconLink={infoIcon} className="w-10 h-10 text-amber-500"></IconContainer>
                                            </div>
                                            <div>
                                                <Text className="text-lg font-medium text-amber-700">Nhà cung cấp này chưa có sản phẩm nào</Text>
                                                <Text className="text-sm text-amber-600 mt-2">Vui lòng chọn nhà cung cấp khác hoặc thêm sản phẩm cho nhà cung cấp này trước</Text>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {orderForm.product_details.length === 0 && filteredProductOptions.length > 0 && (
                                    <div className="text-center py-16 mt-3 mb-4 relative">
                                        <div className="absolute inset-0 flex items-center justify-center ">
                                            <div className="text-gray-400">
                                                <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                                </svg>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-center justify-center pt-16 ">
                                            <Text className="text-xl font-medium text-gray-600">Chưa có sản phẩm nào trong phiếu đặt hàng</Text>
                                            <Text className="text-gray-500 mt-1">Bấm nút 'Thêm sản phẩm' phía dưới để thêm sản phẩm vào phiếu đặt hàng</Text>
                                        </div>
                                    </div>
                                )}

                                {/* Danh sách sản phẩm */}
                                {orderForm.product_details.map((
                                    orderFormProductDetail: IOrderFormProductDetail,
                                    index: number
                                ): ReactElement => {
                                    return <div
                                        key={index}
                                        className="grid items-center grid-cols-[60px_2fr_1fr_1fr_1fr_80px] py-4 border-b border-gray-200 hover:bg-gray-50"
                                    >
                                        {/* Nội dung sản phẩm */}
                                        <Text className="font-medium text-center text-gray-700">{index + 1}</Text>

                                        <SelectDropdown
                                            className="mx-2 bg-white border border-gray-300 hover:border-blue-400 rounded"
                                            isLoading={isProductLoading}
                                            options={filteredProductOptions}
                                            defaultOptionIndex={getSelectedOptionIndex(
                                                filteredProductOptions,
                                                (orderFormProductDetail._id
                                                    ? orderFormProductDetail._id
                                                    : 0
                                                ) as unknown as string
                                            )}
                                            onInputChange={(e): void =>
                                                handleChangeOrderFormProductId(e, index)
                                            }
                                        />

                                        {/* Trường nhập giá nhập */}
                                        <NumberInput
                                            min={0}
                                            max={9999999}
                                            name={`input_price`}
                                            isRequire={true}
                                            className="mx-2"
                                            value={formatInputPrice(orderFormProductDetail.input_price)}
                                            onInputChange={(e): void =>
                                                handleChangeOrderFormProductInputPrice(e, index)
                                            }
                                        />

                                        <SelectDropdown
                                            className="mx-2 bg-white border border-gray-300 hover:border-blue-400 rounded"
                                            isLoading={isUnitLoading}
                                            options={unitOptions}
                                            defaultOptionIndex={getSelectedOptionIndex(
                                                unitOptions,
                                                (orderFormProductDetail.unit_id
                                                    ? orderFormProductDetail.unit_id
                                                    : 0
                                                ) as unknown as string
                                            )}
                                            onInputChange={(e): void =>
                                                handleChangeOrderFormProductUnitId(e, index)
                                            }
                                        />

                                        <NumberInput
                                            min={1}
                                            max={100}
                                            name={`quantity`}
                                            className="mx-2"
                                            value={orderFormProductDetail.quantity + ``}
                                            onInputChange={(e): void =>
                                                handleChangeOrderFormProductQuantity(e, index)
                                            }
                                        />

                                        <div className="flex justify-center">
                                            <Button
                                                onClick={(): void => handleDeleteOrderFormProduct(index)}
                                                className="hover:bg-red-50 p-2 rounded-full text-red-500 hover:text-red-600 transition-all"
                                                title="Xóa sản phẩm này"
                                            >
                                                <IconContainer iconLink={trashIcon} className="w-5 h-5"></IconContainer>
                                            </Button>
                                        </div>
                                    </div>
                                })}
                            </div>
                        </div>
                    </TabItem>
                </Tabs>

                {notificationElements}

                <div className="mt-8 flex flex-col items-center space-y-8">
                    <Button
                        isDisable={isProductLoading || isBusinessLoading || filteredProductOptions.length === 0}
                        onClick={handleAddOrderFormProduct}
                        className="flex items-center justify-center gap-2 w-full max-w-lg py-3 rounded-lg text-white font-medium bg-green-500 hover:bg-green-600 transition-all"
                        type={EButtonType.SUCCESS}
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                        </svg>
                        Thêm sản phẩm
                    </Button>
                </div>

                <Button
                    onClick={handleSaveClick}
                    className="w-full py-3 mt-8 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium flex items-center justify-center gap-2"
                    isLoading={isSaving}
                    type={EButtonType.SUCCESS}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Lưu phiếu đặt hàng
                </Button>
            </div>
        </div>
    );
} 