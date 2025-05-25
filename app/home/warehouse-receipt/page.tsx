/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { Button, IconContainer, NumberInput, SelectDropdown, Text } from '@/components'
import ManagerPage, { ICollectionIdNotify } from '@/components/manager-page/manager-page'
import { IColumnProps } from '@/components/table/interfaces/column-props.interface'
import { ECollectionNames } from '@/enums'
import React, { ChangeEvent, ReactElement, useCallback, useEffect, useRef, useState } from 'react'
import InputSection from '../components/input-section/input-section';
import { infoIcon, trashIcon } from '@/public';
import { createDeleteTooltip, createMoreInfoTooltip } from '@/utils/create-tooltip';
import TabItem from '@/components/tabs/components/tab-item/tab-item';
import Tabs from '@/components/tabs/tabs';
import { IWarehouseReceipt, IWarehouseProductDetail } from '@/interfaces/warehouse-receipt.interface';
import { DEFAULT_WAREHOUSE_RECEIPT } from '@/constants/warehouse-receipt.constant';
import { fetchGetCollections } from '@/utils/fetch-get-collections';
import { translateCollectionName } from '@/utils/translate-collection-name';
import { IOrderForm, IOrderFormProductDetail, OrderFormStatus } from '@/interfaces/order-form.interface';
import { ISelectOption } from '@/components/select-dropdown/interfaces/select-option.interface';
import { getSelectedOptionIndex } from '@/components/select-dropdown/utils/get-selected-option-index';
import { DEFAULT_ORDER_FORM } from '@/constants/order-form.constant';
import { IProductDetail } from '@/interfaces/product-detail.interface';
import { IProduct } from '@/interfaces/product.interface';
import { IBusiness } from '@/interfaces/business.interface';
import { IUnit } from '@/interfaces/unit.interface';
import { EButtonType } from '@/components/button/interfaces/button-type.interface';
import useNotificationsHook from '@/hooks/notifications-hook';
import { ENotificationType } from '@/components/notify/notification/notification';
import { addCollection, fetchCollection, updateOrderStatus } from '@/services/api-service';
import { EStatusCode } from '@/enums/status-code.enum';
import { useQuery, QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query'
import { generateBatchNumber } from '@/utils/batch-number';
import BarcodeComponent from '@/components/barcode/barcode';
import dynamic from 'next/dynamic';

// Import Barcode component với dynamic import
const DynamicReactBarcode = dynamic(() => import('react-barcode'), { ssr: false });

// Interfaces
interface IDateFilter {
  label: string;
  days: number;
  value: string;
}

interface IAllData {
  products: IProduct[];
  productDetails: IProductDetail[];
  businesses: IBusiness[];
  units: IUnit[];
  orderForms: IOrderForm[];
}

type collectionType = IWarehouseReceipt;
const collectionName: ECollectionNames = ECollectionNames.WAREHOUSE_RECEIPT;

// Helper functions
const formatReceiptCode = (id: string, date: Date): string => {
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear().toString();
  const dateStr = `${day}${month}${year}`;

  // Tạo số thứ tự từ id
  const sequence = id.substring(id.length - 4).padStart(4, '0');

  return `NK-${dateStr}-${sequence}`;
};

// Hàm mới định dạng mã phiếu đặt hàng
const formatOrderFormCode = (id: string): string => {
  const now = new Date();
  const day = now.getDate().toString().padStart(2, '0');
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const year = now.getFullYear().toString();
  const dateStr = `${day}${month}${year}`;

  // Lấy 4 ký tự cuối của id
  const sequence = id.slice(-4);

  return `DH-${dateStr}-${sequence}`;
};

// Hàm định dạng số thành chuỗi tiền tệ VND với dấu chấm phân cách
const formatCurrency = (value: number | string): string => {
  const numericValue = typeof value === 'string' ? Number(value.replace(/\./g, '')) : value;
  if (isNaN(numericValue)) return '';
  return numericValue.toLocaleString('vi-VN');
};

// Hàm xử lý chuỗi tiền tệ VND thành số
const parseCurrency = (value: string): number => {
  const numericValue = value.replace(/\./g, '');
  return Number(numericValue);
};

const formatShortDate = (date: Date | null | undefined, separator: string = '/'): string => {
  if (!date) return '';

  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';

    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();

    return separator === ''
      ? `${day}${month}${year}`
      : `${day}${separator}${month}${separator}${year}`;
  } catch {
    return '';
  }
};

// Tạo QueryClient instance
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // Cache for 5 minutes
      refetchOnWindowFocus: false, // Không refetch khi focus window
      retry: 1, // Chỉ retry 1 lần khi lỗi
    },
  },
});

// Tạo provider component
function WarehouseReceiptProvider() {
  return (
    <QueryClientProvider client={queryClient}>
      <WarehouseReceipt />
    </QueryClientProvider>
  );
}

// Main component
function WarehouseReceipt() {
  const { createNotification, notificationElements } = useNotificationsHook();
  const queryClient = useQueryClient();

  // States
  const [warehouseReceipt, setWarehouseReceipt] = useState<collectionType>(DEFAULT_WAREHOUSE_RECEIPT);
  const [orderForm, setOrderForm] = useState<IOrderForm>(DEFAULT_ORDER_FORM);
  const [isModalReadOnly, setIsModalReadOnly] = useState<boolean>(false);
  const [isClickShowMore, setIsClickShowMore] = useState<ICollectionIdNotify>({ id: ``, isClicked: false });
  const [isClickDelete, setIsClickDelete] = useState<ICollectionIdNotify>({ id: ``, isClicked: false });
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [dateFilter, setDateFilter] = useState<string>('1');
  const [pendingDateFilter, setPendingDateFilter] = useState<string>('1');
  const [customDate, setCustomDate] = useState<string>('');
  const [filteredReceiptCount, setFilteredReceiptCount] = useState<number>(0);
  const [orderFormOptions, setOrderFormOptions] = useState<ISelectOption[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Fetch receipts theo filter
  const [warehouseReceipts, setWarehouseReceipts] = useState<IWarehouseReceipt[]>([]);
  const [isLoadingWarehouseReceipts, setIsLoadingWarehouseReceipts] = useState<boolean>(false);

  const fetchWarehouseReceipts = useCallback(async (date: string, customDateValue?: string) => {
    setIsLoadingWarehouseReceipts(true);
    try {
      let url = '/api/warehouse-receipt';
      if (date && date !== '0') {
        url += `?date=${date}`;
        if (date === 'custom' && customDateValue) {
          url += `&customDate=${customDateValue}`;
        }
      }
      console.log('Gọi API:', url); // Log URL để debug
      const response = await fetch(url);
      const receipts = await response.json();
      setWarehouseReceipts(receipts);
    } catch (e) {
      // handle error
    } finally {
      setIsLoadingWarehouseReceipts(false);
    }
  }, []);

  useEffect(() => {
    setDateFilter('1');
    setPendingDateFilter('1');
    fetchWarehouseReceipts('1');
  }, [fetchWarehouseReceipts]);

  const handleApplyFilter = () => {
    if (pendingDateFilter === 'custom' && !customDate) {
      createNotification({
        id: 0,
        children: <Text>Vui lòng chọn ngày cụ thể trước khi lọc</Text>,
        type: ENotificationType.ERROR,
        isAutoClose: true,
        title: "Lỗi nhập liệu"
      });
      return;
    }

    setDateFilter(pendingDateFilter);
    setCurrentPage(1);
    fetchWarehouseReceipts(pendingDateFilter, customDate);
  };

  // Cập nhật số lượng phiếu đã lọc sau mỗi lần fetch
  useEffect(() => {
    setFilteredReceiptCount(warehouseReceipts.length);
  }, [warehouseReceipts]);

  // Thêm các hàm xử lý sự kiện
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

  const handleChangeWarehouseReceiptProductNote = useCallback((e: ChangeEvent<HTMLTextAreaElement>, index: number): void => {
    const newNote = e.target.value;
    setWarehouseReceipt(prev => {
      const newProductDetails = [...prev.product_details];
      newProductDetails[index] = {
        ...newProductDetails[index],
        note: newNote
      };
      return {
        ...prev,
        product_details: newProductDetails
      };
    });
  }, []);

  // Hàm xử lý thay đổi giá nhập với định dạng tiền tệ
  const handleChangeWarehouseReceiptProductPrice = useCallback((e: ChangeEvent<HTMLInputElement>, index: number): void => {
    const inputValue = e.target.value;
    // Chỉ cho phép nhập số
    const numericValue = parseCurrency(inputValue);

    if (isNaN(numericValue)) return;

    setWarehouseReceipt(prev => {
      const newProductDetails = [...prev.product_details];
      newProductDetails[index] = {
        ...newProductDetails[index],
        input_price: numericValue
      } as IWarehouseProductDetail;
      return {
        ...prev,
        product_details: newProductDetails
      };
    });
  }, []);

  // React Query hooks
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

  const { data: productDetails = [], isLoading: isLoadingProductDetails } = useQuery({
    queryKey: ['productDetails'],
    queryFn: () => fetchGetCollections<IProductDetail>(ECollectionNames.PRODUCT_DETAIL),
    enabled: products.length > 0,
  });

  const { data: orderForms = [], isLoading: isLoadingOrderForms } = useQuery({
    queryKey: ['warehouse-receipt'],
    queryFn: async () => {
      try {
        // Lấy tất cả phiếu đặt hàng
        const allOrderForms = await fetchGetCollections<IOrderForm>(ECollectionNames.ORDER_FORM);

        // Lấy tất cả phiếu nhập kho để kiểm tra phiếu đặt hàng đã sử dụng
        const allWarehouseReceipts = await fetchGetCollections<IWarehouseReceipt>(ECollectionNames.WAREHOUSE_RECEIPT);

        // Lấy danh sách ID phiếu đặt hàng đã được sử dụng
        const usedOrderFormIds = allWarehouseReceipts.map(receipt => receipt.supplier_receipt_id);

        // Lọc tất cả phiếu đặt hàng có trạng thái PENDING
        const pendingOrderForms = allOrderForms.filter(form => form.status === OrderFormStatus.PENDING);

        // Đánh dấu các phiếu đã được sử dụng
        const markedOrderForms = pendingOrderForms.map(form => ({
          ...form,
          isUsed: usedOrderFormIds.includes(form._id)
        }));

        // Sắp xếp: phiếu chưa sử dụng lên đầu
        const sortedOrderForms = markedOrderForms.sort((a, b) => {
          if (a.isUsed === b.isUsed) return 0;
          return a.isUsed ? 1 : -1;
        });

        console.log(`Tìm thấy ${pendingOrderForms.length} phiếu đặt hàng chưa hoàn thành, trong đó ${markedOrderForms.filter(f => f.isUsed).length} phiếu đã được sử dụng`);

        return sortedOrderForms;
      } catch (error) {
        console.error('Lỗi khi lấy phiếu đặt hàng:', error);
        return [];
      }
    },
    enabled: businesses.length > 0,
  });

  // Thêm useEffect để xử lý dữ liệu và cập nhật SelectDropdown
  useEffect(() => {
    if (orderForms.length > 0) {
      // Cập nhật danh sách options cho SelectDropdown
      const newOrderFormOptions = orderForms.map(form => ({
        label: `${formatOrderFormCode(form._id)} - ${formatShortDate(new Date(form.created_at))}${form.isUsed ? ' (Đã sử dụng)' : ''}`,
        value: form._id,
        disabled: form.isUsed // Disable các phiếu đã sử dụng
      }));
      setOrderFormOptions(newOrderFormOptions);

      // Kiểm tra xem phiếu đặt hàng hiện tại có còn tồn tại trong danh sách mới không
      const currentOrderFormExists = orderForms.some(form => form._id === orderForm._id);

      // Nếu phiếu đặt hàng hiện tại không tồn tại hoặc chưa có phiếu nào được chọn
      if (!currentOrderFormExists || !orderForm._id) {
        const firstOrderForm = orderForms[0];
        setOrderForm(firstOrderForm);

        // Quan trọng: Chỉ chuyển các trường cần thiết, giữ nguyên ID của sản phẩm
        setWarehouseReceipt(prev => ({
          ...prev,
          supplier_id: firstOrderForm.supplier_id,
          supplier_receipt_id: firstOrderForm._id,
          product_details: firstOrderForm.product_details.map(detail => ({
            ...detail, // Giữ nguyên _id từ phiếu đặt hàng
            date_of_manufacture: '',
            expiry_date: '',
            batch_number: generateBatchNumber(detail._id), // Tự động tạo số lô
            note: ''
          } as IWarehouseProductDetail))
        }));
      }
    } else if (orderFormOptions.length > 0) {
      // Chỉ reset khi có dữ liệu cần reset
      setOrderFormOptions([]);
      setOrderForm(DEFAULT_ORDER_FORM);
      setWarehouseReceipt(DEFAULT_WAREHOUSE_RECEIPT);
    }
  }, [orderForms]);

  useEffect(() => {
    // Tự động tạo số lô cho các sản phẩm khi component được tải
    if (warehouseReceipt.product_details && warehouseReceipt.product_details.length > 0) {
      console.log('Đang tự động tạo số lô cho sản phẩm khi khởi tạo component');
      setWarehouseReceipt(prev => {
        // Log thông tin sản phẩm trước khi tạo số lô
        console.log('Danh sách sản phẩm trước khi tạo số lô:', JSON.stringify(prev.product_details));

        const newProductDetails = prev.product_details.map(detail => {
          if (!detail.batch_number) {
            console.log(`Tạo số lô cho sản phẩm ID: ${detail._id}`);
            return {
              ...detail,
              batch_number: generateBatchNumber(detail._id)
            };
          }
          return detail;
        });

        // Log thông tin sau khi tạo số lô
        console.log('Danh sách sản phẩm sau khi tạo số lô:', JSON.stringify(newProductDetails));

        return {
          ...prev,
          product_details: newProductDetails
        };
      });
    }
  }, []);

  // Derived states
  const isLoading = isLoadingProducts || isLoadingUnits || isLoadingBusinesses ||
    isLoadingProductDetails || isLoadingOrderForms || isLoadingWarehouseReceipts;

  // Prepare dropdown options
  const productOptions = React.useMemo(() => {
    // Tạo options từ products thay vì productDetails
    if (products.length === 0) return [];

    return products.map(product => ({
      label: product.name || '',
      value: product._id
    }));
  }, [products]);

  const supplierOptions = React.useMemo(() =>
    businesses
      // .filter(b => b.type === 'SUPPLIER')  // Loại bỏ bộ lọc type vì không tồn tại trong IBusiness
      .map(supplier => ({
        label: supplier.name,
        value: supplier._id
      })), [businesses]);

  const unitOptions = React.useMemo(() =>
    units.map(unit => ({
      label: unit.name,
      value: unit._id
    })), [units]);

  // Date filters
  const dateFilters: IDateFilter[] = [
    { label: 'Tất cả', days: 0, value: '0' },
    { label: 'Hôm nay', days: 1, value: '1' },
    { label: '7 ngày qua', days: 7, value: '7' },
    { label: 'Tháng này', days: 30, value: '30' },
    { label: 'Tháng trước', days: 60, value: '60' },
    { label: 'Chọn ngày cụ thể', days: -1, value: 'custom' },
  ];

  // Sắp xếp danh sách phiếu nhập kho (không lọc lại trên client)
  const sortedWarehouseReceipts = React.useMemo(() => {
    return [...warehouseReceipts].sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }, [warehouseReceipts]);

  // Handlers
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

    // Kiểm tra xem phiếu đặt hàng có còn tồn tại trong danh sách hiện tại không
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

    // Kiểm tra chi tiết phiếu nhập kho và sửa các lỗi nhỏ
    const fixedProductDetails = warehouseReceipt.product_details.map(detail => {
      // Đảm bảo có batch_number
      const batchNumber = detail.batch_number || generateBatchNumber(detail._id);

      // Xử lý input_price
      let inputPrice = 0;
      if (typeof detail.input_price === 'number') {
        inputPrice = detail.input_price;
      } else if (typeof detail.input_price === 'string') {
        const numericString = String(detail.input_price).replace(/[^\d]/g, '');
        inputPrice = numericString ? parseInt(numericString) : 0;
      }

      // Xử lý quantity
      let quantity = 0;
      if (typeof detail.quantity === 'number') {
        quantity = detail.quantity;
      } else if (typeof detail.quantity === 'string') {
        quantity = parseInt(detail.quantity) || 0;
      }

      // Tạo bản sao để không ảnh hưởng đến state gốc
      return {
        ...detail,
        batch_number: batchNumber,
        input_price: inputPrice,
        quantity: quantity
      };
    });

    // Cập nhật state với dữ liệu đã được sửa
    setWarehouseReceipt(prev => ({
      ...prev,
      product_details: fixedProductDetails
    }));

    // Log phiếu nhập kho đã được sửa
    console.log('Phiếu nhập kho sau khi đã sửa:', {
      supplier_id: warehouseReceipt.supplier_id,
      supplier_receipt_id: warehouseReceipt.supplier_receipt_id,
      product_details: fixedProductDetails
    });

    // Kiểm tra số lượng hợp lệ
    const invalidQuantity = fixedProductDetails.some(detail => !detail.quantity || detail.quantity <= 0);
    if (invalidQuantity) {
      createNotification({
        children: 'Số lượng sản phẩm không được để trống hoặc nhỏ hơn 1',
        type: ENotificationType.WARNING,
        isAutoClose: true
      });
      return;
    }

    // Kiểm tra giá nhập
    const invalidPrice = fixedProductDetails.some(detail => !detail.input_price || detail.input_price <= 0);
    if (invalidPrice) {
      createNotification({
        children: 'Giá nhập không được để trống hoặc nhỏ hơn 1',
        type: ENotificationType.WARNING,
        isAutoClose: true
      });
      return;
    }

    // Kiểm tra ngày sản xuất và hạn sử dụng
    const missingDates = fixedProductDetails.some(detail => !detail.date_of_manufacture || !detail.expiry_date);
    if (missingDates) {
      createNotification({
        children: 'Ngày sản xuất và hạn sử dụng không được để trống',
        type: ENotificationType.WARNING,
        isAutoClose: true
      });
      return;
    }

    // Kiểm tra nếu có sản phẩm nào có HSD <= NSX thì không cho lưu
    const invalidDates = fixedProductDetails.some(detail => {
      if (!detail.date_of_manufacture || !detail.expiry_date) return false;

      const mfgDate = new Date(detail.date_of_manufacture);
      const expDate = new Date(detail.expiry_date);

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

    try {
      setIsSaving(true);
      const response = await addCollection(warehouseReceipt, collectionName);
      if (response.status === EStatusCode.OK || response.status === EStatusCode.CREATED) {
        // Update order form status
        createNotification({
          children: 'Tạo phiếu nhập kho thành công!',
          type: ENotificationType.SUCCESS,
          isAutoClose: true,
          id: Math.random(),
        });
        await updateOrderStatus(warehouseReceipt.supplier_receipt_id, OrderFormStatus.COMPLETED);
        // Refetch lại danh sách phiếu đặt hàng (SelectDropdown)
        await queryClient.invalidateQueries({ queryKey: ['warehouse-receipt'] });
        // Lấy lại danh sách orderForms mới nhất
        const updatedOrderForms = await fetchGetCollections<IOrderForm>(ECollectionNames.ORDER_FORM) as IOrderForm[];
        const updatedWarehouseReceipts = await fetchGetCollections<IWarehouseReceipt>(ECollectionNames.WAREHOUSE_RECEIPT) as IWarehouseReceipt[];
        const usedOrderFormIds = updatedWarehouseReceipts.map((receipt: IWarehouseReceipt) => receipt.supplier_receipt_id);
        const pendingOrderForms = updatedOrderForms.filter((form: IOrderForm) => form.status === OrderFormStatus.PENDING && !usedOrderFormIds.includes(form._id));
        if (pendingOrderForms.length > 0) {
          const nextOrderForm = pendingOrderForms[0] as IOrderForm;
          setOrderForm(nextOrderForm);
          setWarehouseReceipt(prev => ({
            ...prev,
            supplier_id: nextOrderForm.supplier_id,
            supplier_receipt_id: nextOrderForm._id,
            product_details: nextOrderForm.product_details.map((detail: any) => ({
              ...detail,
              date_of_manufacture: '',
              expiry_date: '',
              batch_number: generateBatchNumber(detail._id),
              note: '',
              input_price: detail.input_price ?? 0
            }))
          }));
        } else {
          setOrderForm(DEFAULT_ORDER_FORM);
          setWarehouseReceipt(DEFAULT_WAREHOUSE_RECEIPT);
        }
        // Hiển thị thông báo thành công

      } else {
        let errorMessage = 'Không thể lưu phiếu nhập kho';
        try {
          const errorData = await response.json();
          if (errorData && errorData.message) {
            errorMessage = errorData.message;
          }
        } catch (err) {
          // Không làm gì, giữ errorMessage mặc định
        }
        // Thông báo lỗi
        createNotification({
          children: errorMessage,
          type: ENotificationType.ERROR,
          isAutoClose: true,
          id: Math.random(),
        });
        throw new Error(errorMessage);
      }
    } catch (error) {
      // Hiển thị thông báo lỗi cho người dùng
      createNotification({
        children: error instanceof Error ? error.message : 'Không thể lưu phiếu nhập kho',
        type: ENotificationType.ERROR,
        isAutoClose: true,
        id: Math.random(),
      });
    } finally {
      setIsSaving(false);
    }
  }, [warehouseReceipt, isSaving, orderForms, queryClient]);

  const handleOpenModal = useCallback((prev: boolean): boolean => {
    return !prev;
  }, []);

  const additionalProcessing = useCallback((items: IWarehouseReceipt[]): IWarehouseReceipt[] => {
    if (!dateFilter || dateFilter === '0') {
      setFilteredReceiptCount(items.length);
      return items;
    }

    try {
      const filterDays = parseInt(dateFilter);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      let filteredReceipts: IWarehouseReceipt[] = [];

      if (dateFilter === 'custom' && customDate) {
        const selectedDate = new Date(customDate);
        selectedDate.setHours(0, 0, 0, 0);
        filteredReceipts = items.filter(receipt => {
          const receiptDate = new Date(receipt.created_at);
          receiptDate.setHours(0, 0, 0, 0);
          return receiptDate.getTime() === selectedDate.getTime();
        });
      } else if (filterDays === 30) {
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        filteredReceipts = items.filter(receipt => {
          const receiptDate = new Date(receipt.created_at);
          return receiptDate >= firstDayOfMonth && receiptDate <= today;
        });
      } else if (filterDays === 60) {
        const firstDayOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastDayOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
        filteredReceipts = items.filter(receipt => {
          const receiptDate = new Date(receipt.created_at);
          return receiptDate >= firstDayOfLastMonth && receiptDate <= lastDayOfLastMonth;
        });
      } else {
        const pastDate = new Date(today);
        pastDate.setDate(pastDate.getDate() - (filterDays - 1));

        filteredReceipts = items.filter(receipt => {
          const receiptDate = new Date(receipt.created_at);
          return receiptDate >= pastDate && receiptDate <= today;
        });
      }

      setFilteredReceiptCount(filteredReceipts.length);
      return filteredReceipts;
    } catch {
      setFilteredReceiptCount(items.length);
      return items;
    }
  }, [dateFilter, customDate]);

  // Render bộ lọc
  const renderDateFilters = useCallback((): ReactElement => {
    return (
      <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-100 mb-5">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Text className="text-gray-700 font-medium whitespace-nowrap">Lọc theo thời gian:</Text>
            {filteredReceiptCount > 0 && (
              <div className="bg-blue-100 text-blue-800 text-xs font-medium rounded-full px-2.5 py-1 ml-2">
                {filteredReceiptCount} phiếu
              </div>
            )}
          </div>

          <div className="flex items-center flex-wrap">
            <div className="w-64">
              <SelectDropdown
                className="bg-white border border-gray-200 hover:border-blue-400 shadow-sm transition-all w-full"
                options={dateFilters.map(filter => ({
                  label: filter.label,
                  value: filter.value
                }))}
                defaultOptionIndex={getSelectedOptionIndex(
                  dateFilters.map(filter => ({
                    label: filter.label,
                    value: filter.value
                  })),
                  pendingDateFilter
                )}
                onInputChange={e => setPendingDateFilter(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-3 ml-3">
              {pendingDateFilter === 'custom' ? (
                <div className="flex items-center">
                  <div className="relative">
                    <input
                      type="date"
                      value={customDate}
                      onChange={e => setCustomDate(e.target.value)}
                      className="border border-gray-200 rounded-md px-3 py-2 min-w-[200px] text-lg shadow-sm focus:border-blue-400 focus:outline-none transition-all"
                      required
                      placeholder="dd/mm/yyyy"
                    />
                  </div>
                  <Button
                    onClick={handleApplyFilter}
                    type={EButtonType.INFO}
                    className="ml-3 px-5 py-2 font-medium shadow-md hover:shadow-lg transition-all"
                  >
                    Lọc
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={handleApplyFilter}
                  type={EButtonType.INFO}
                  className="px-5 py-2 font-medium shadow-md hover:shadow-lg transition-all"
                >
                  Lọc
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }, [pendingDateFilter, filteredReceiptCount, customDate, handleApplyFilter]);

  const renderContent = useCallback((): ReactElement => {
    return (
      <Tabs>
        <TabItem label={translateCollectionName(collectionName)}>
          <div className="bg-white rounded-3xl border border-gray-200 shadow-2xl p-10 mb-10">
            <div className="mb-6">
              <div className="grid grid-cols-2 gap-10">
                <InputSection label="Chọn phiếu đặt hàng" gridColumns="180px 1fr">
                  <SelectDropdown
                    isLoading={isLoading}
                    isDisable={isModalReadOnly}
                    options={orderFormOptions}
                    defaultOptionIndex={getSelectedOptionIndex(orderFormOptions, orderForm._id)}
                    onInputChange={(e): void => {
                      const selectedForm = orderForms.find(form => form._id === e.target.value);
                      if (selectedForm) {
                        setOrderForm(selectedForm);

                        // Cập nhật warehouseReceipt với dữ liệu từ phiếu đặt hàng mới
                        // Đảm bảo giữ đúng ID sản phẩm và thông tin khác
                        setWarehouseReceipt(prev => ({
                          ...prev,
                          supplier_id: selectedForm.supplier_id,
                          supplier_receipt_id: selectedForm._id,
                          product_details: selectedForm.product_details.map(detail => ({
                            ...detail, // Giữ nguyên thông tin sản phẩm từ phiếu đặt hàng
                            date_of_manufacture: '',
                            expiry_date: '',
                            batch_number: generateBatchNumber(detail._id), // Tự động tạo số lô
                            note: ''
                          } as IWarehouseProductDetail))
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
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                          <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                          <path d="M9 14l2 2 4-4"></path>
                        </svg>
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
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2">
                          <path d="M20 3H4a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V4a1 1 0 0 0-1-1Z"></path>
                          <path d="M12 7v10"></path>
                          <path d="M7 12h10"></path>
                        </svg>
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

                  // Tìm sản phẩm dựa vào ID trực tiếp từ products
                  const product = products.find(p => p._id === orderFormProductDetail._id);
                  const productName = product?.name || '';

                  return (
                    <div key={index} className="grid grid-cols-2 gap-6 border-b border-gray-100 py-3 hover:bg-gray-50 transition-all items-center relative">
                      <div className="grid grid-cols-5 items-center gap-1" style={{ gridTemplateColumns: "30px 1fr 1fr 1fr 1fr" }}>
                        <div className="text-center font-bold text-gray-700">{index + 1}</div>
                        <div className="flex justify-center items-center">
                          {/* Hiển thị tên sản phẩm từ products */}
                          <SelectDropdown
                            isLoading={isLoading}
                            isDisable={true}
                            options={productOptions}
                            defaultOptionIndex={getSelectedOptionIndex(productOptions, orderFormProductDetail._id)}
                            className="bg-gray-50 border border-gray-200 rounded-lg w-full"
                          />
                        </div>
                        <div className="flex justify-center items-center">
                          <SelectDropdown
                            isLoading={isLoading}
                            isDisable={true}
                            options={unitOptions}
                            defaultOptionIndex={getSelectedOptionIndex(unitOptions, orderFormProductDetail.unit_id)}
                            className="bg-gray-50 border border-gray-200 rounded-lg w-full"
                          />
                        </div>
                        <div className="flex justify-center items-center">
                          <NumberInput
                            min={1}
                            max={100}
                            name={`quantity`}
                            isDisable={true}
                            value={orderFormProductDetail.quantity + ``}
                            className="bg-gray-200 border border-gray-200 rounded-lg text-center font-bold w-full"
                          />
                        </div>
                        <div className="text-center text-blue-700 font-bold">{orderFormProductDetail.input_price ? orderFormProductDetail.input_price.toLocaleString('vi-VN') : ''}</div>
                      </div>

                      {/* Mũi tên thể hiện luồng dữ liệu */}
                      <div className="absolute left-1/2 transform -translate-x-1/2 flex items-center justify-center z-10">
                        <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center border-2 border-blue-300">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-700">
                            <path d="M5 12h14"></path>
                            <path d="m12 5 7 7-7 7"></path>
                          </svg>
                        </div>
                      </div>

                      <div className="grid grid-cols-7 items-center gap-1">
                        <div className="flex justify-center items-center">
                          <SelectDropdown
                            isLoading={isLoading}
                            isDisable={true}
                            options={productOptions}
                            defaultOptionIndex={getSelectedOptionIndex(productOptions, warehouseProductDetail?._id)}
                            className="bg-gray-50 border border-gray-200 rounded-lg w-full"
                          />
                        </div>
                        <div className="flex justify-center items-center">
                          <SelectDropdown
                            isLoading={isLoading}
                            isDisable={true}
                            options={unitOptions}
                            defaultOptionIndex={getSelectedOptionIndex(unitOptions, warehouseProductDetail?.unit_id)}
                            className="bg-gray-50 border border-gray-200 rounded-lg w-full"
                          />
                        </div>
                        <div className="flex justify-center items-center relative">
                          <NumberInput
                            min={1}
                            max={100}
                            name={`quantity`}
                            isDisable={isModalReadOnly}
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
                            disabled={isModalReadOnly}
                            value={warehouseProductDetail?.date_of_manufacture || ''}
                            onChange={(e: ChangeEvent<HTMLInputElement>): void => {
                              setWarehouseReceipt(prev => {
                                const newProductDetails = [...prev.product_details];
                                newProductDetails[index] = {
                                  ...newProductDetails[index],
                                  date_of_manufacture: e.target.value,
                                  // Nếu chưa có số lô thì tự động tạo
                                  batch_number: newProductDetails[index].batch_number || generateBatchNumber(newProductDetails[index]._id)
                                } as IWarehouseProductDetail;
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
                        </div>
                        <div className="flex justify-center items-center relative">
                          <input
                            type="date"
                            name={`expiry_date`}
                            disabled={isModalReadOnly}
                            value={warehouseProductDetail?.expiry_date || ''}
                            onChange={(e: ChangeEvent<HTMLInputElement>): void => {
                              setWarehouseReceipt(prev => {
                                const newProductDetails = [...prev.product_details];
                                newProductDetails[index] = {
                                  ...newProductDetails[index],
                                  expiry_date: e.target.value
                                } as IWarehouseProductDetail;
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
                            disabled={isModalReadOnly}
                            value={warehouseProductDetail?.input_price ? formatCurrency(warehouseProductDetail.input_price) : ''}
                            onChange={(e: ChangeEvent<HTMLInputElement>): void => {
                              const numericValue = parseCurrency(e.target.value);
                              if (isNaN(numericValue) && e.target.value !== '') return;

                              setWarehouseReceipt(prev => {
                                const newProductDetails = [...prev.product_details];
                                newProductDetails[index] = {
                                  ...newProductDetails[index],
                                  input_price: numericValue
                                } as IWarehouseProductDetail;
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
                            disabled={isModalReadOnly}
                            value={warehouseProductDetail?.note || ''}
                            onChange={(e: ChangeEvent<HTMLInputElement>): void => {
                              setWarehouseReceipt(prev => {
                                const newProductDetails = [...prev.product_details];
                                newProductDetails[index] = {
                                  ...newProductDetails[index],
                                  note: e.target.value
                                } as IWarehouseProductDetail;
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

                      {/* Hiển thị thông tin số lô và mã vạch */}
                      <div className="col-span-2 mt-2 grid grid-cols-2 gap-4">
                        <div className="flex flex-col">
                          <label className="text-sm font-medium text-gray-700 mb-1">Số lô</label>
                          <BarcodeComponent
                            productId={warehouseProductDetail?._id || ''}
                            value={warehouseProductDetail?.batch_number || ''}
                            onChange={(value: string) => {
                              setWarehouseReceipt(prev => {
                                const newProductDetails = [...prev.product_details];
                                newProductDetails[index] = {
                                  ...newProductDetails[index],
                                  batch_number: value
                                } as IWarehouseProductDetail;
                                return {
                                  ...prev,
                                  product_details: newProductDetails
                                };
                              });
                            }}
                          />
                        </div>
                        <div className="flex flex-col">
                          <label className="text-sm font-medium text-gray-700 mb-1">Mã vạch</label>
                          <div className="border border-gray-200 rounded-lg py-2 px-3 bg-gray-50 h-[50px] flex items-center justify-center">
                            {warehouseProductDetail?.batch_number ? (
                              <div className="w-full flex justify-center">
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
          </div>
        </TabItem>
      </Tabs>
    );
  }, [isLoading, isModalReadOnly, notificationElements, orderForm, warehouseReceipt, productOptions, unitOptions, orderFormOptions, supplierOptions, isClickShowMore, isClickDelete, isSaving, handleSaveClick]);

  const columns: Array<IColumnProps<collectionType>> = [
    {
      key: `index`,
      ref: useRef(null),
      title: `#`,
      size: `1fr`,
    },
    {
      key: `_id`,
      ref: useRef(null),
      title: `Mã phiếu nhập`,
      size: `6fr`,
      render: (collection: collectionType): ReactElement => {
        const receiptCode = formatReceiptCode(collection._id, new Date(collection.created_at));
        return <Text isEllipsis={true} tooltip={receiptCode} className="font-medium text-blue-600">{receiptCode}</Text>;
      }
    },
    {
      key: `product_details`,
      ref: useRef(null),
      title: `Số sản phẩm`,
      size: `3fr`,
      render: (collection: collectionType): ReactElement => {
        return <Text className="text-center">{collection.product_details.length}</Text>;
      }
    },
    {
      key: `created_at`,
      ref: useRef(null),
      title: `Ngày tạo`,
      size: `4fr`,
      render: (collection: collectionType): ReactElement => {
        const date: string = formatShortDate(new Date(collection.created_at));
        return <Text isEllipsis={true} tooltip={date}>{date}</Text>
      }
    },
    {
      key: `updated_at`,
      ref: useRef(null),
      title: `Ngày cập nhật`,
      size: `4fr`,
      render: (collection: collectionType): ReactElement => {
        const date: string = formatShortDate(new Date(collection.updated_at));
        return <Text isEllipsis={true} tooltip={date}>{date}</Text>
      }
    },
    {
      title: `Thao tác`,
      ref: useRef(null),
      size: `6fr`,
      render: (collection: collectionType): ReactElement => (
        <div className="flex gap-2 justify-center items-center">

          <Button
            title={createMoreInfoTooltip(collectionName)}
            onClick={(): void => {
              setIsClickShowMore({
                id: collection._id,
                isClicked: !isClickShowMore.isClicked,
              });
            }}
            className="bg-white hover:bg-blue-50 border border-blue-200 rounded-full w-9 h-9 flex items-center justify-center"
          >
            <IconContainer
              tooltip={createMoreInfoTooltip(collectionName)}
              iconLink={infoIcon}
              className="text-blue-500"
            />
          </Button>
          {/* <Button
            title={createDeleteTooltip(collectionName)}
            onClick={(): void => {
              setIsClickDelete({
                id: collection._id,
                isClicked: !isClickShowMore.isClicked,
              });
            }}
            className="bg-white hover:bg-red-50 border border-red-200 rounded-full w-9 h-9 flex items-center justify-center"
          >
            <IconContainer
              tooltip={createDeleteTooltip(collectionName)}
              iconLink={trashIcon}
              className="text-red-500"
            />
          </Button> */}
          <Button
            type={EButtonType.TRANSPARENT}
            onClick={(): void => {
              window.location.href = `/home/warehouse-receipt/${collection._id}`;
            }}
            className="bg-white hover:bg-blue-50 border border-blue-200 rounded-full w-9 h-9 flex items-center justify-center"
          >
            <IconContainer
              tooltip="In phiếu nhập kho"
              iconLink="/icons/print.svg"
              className="text-blue-500"
            />
          </Button>
        </div>
      )
    },
  ];

  return (
    <ManagerPage
      columns={columns}
      collectionName={collectionName}
      defaultCollection={DEFAULT_WAREHOUSE_RECEIPT}
      collection={warehouseReceipt}
      setCollection={setWarehouseReceipt}
      isModalReadonly={isModalReadOnly}
      setIsModalReadonly={setIsModalReadOnly}
      isClickShowMore={isClickShowMore}
      isClickDelete={isClickDelete}
      handleOpenModal={handleOpenModal}
      renderFilters={renderDateFilters}
      currentPage={currentPage}
      setCurrentPage={setCurrentPage}
      displayedItems={sortedWarehouseReceipts}
      isLoaded={isLoadingWarehouseReceipts}
    >
      {renderContent()}
    </ManagerPage>
  );
}

export default WarehouseReceiptProvider;