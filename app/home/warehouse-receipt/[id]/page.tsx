/* eslint-disable @typescript-eslint/no-explicit-any */
'use client'

import { Button, LoadingScreen } from '@/components';
import { EButtonType } from '@/components/button/interfaces/button-type.interface';
import { COMPANY } from '@/constants/company.constant';
import { DEFAULT_WAREHOUSE_RECEIPT } from '@/constants/warehouse-receipt.constant';
import { ECollectionNames } from '@/enums';
import { IBusiness } from '@/interfaces/business.interface';
import { IOrderFormProductDetail } from '@/interfaces/order-form.interface';
import { IPageParams } from '@/interfaces/page-params.interface';
import { IProductDetail } from '@/interfaces/product-detail.interface';
import { IProduct } from '@/interfaces/product.interface';
import { IUnit } from '@/interfaces/unit.interface';
import { IWarehouseReceipt } from '@/interfaces/warehouse-receipt.interface';
import { getCollectionById } from '@/services/api-service';
import { fetchGetCollections } from '@/utils/fetch-get-collections';
import { formatCurrency } from '@/utils/format-currency';
import { toPdf } from '@/utils/to-pdf';
import { translateCollectionName } from '@/utils/translate-collection-name';
import React, { ReactElement, useEffect, useRef, useState } from 'react'

type collectionType = IWarehouseReceipt;
const collectionName: ECollectionNames = ECollectionNames.WAREHOUSE_RECEIPT;
const companyAddress: string = COMPANY.address;

// Định nghĩa interface cho IWarehouseProductDetail để giải quyết lỗi
interface IWarehouseProductDetail extends IOrderFormProductDetail {
  date_of_manufacture?: string;
  expiry_date?: string;
  batch_number?: string;
  input_price: number;
}

export default function PreviewOrderForm({
  params
}: IPageParams): ReactElement {
  const { id } = params;
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [warehouseReceipt, setWarehouseReceipt] = useState<collectionType>(
    DEFAULT_WAREHOUSE_RECEIPT
  );
  const [products, setProducts] = useState<IProduct[]>([]);
  const [productDetails, setProductDetails] = useState<IProductDetail[]>([]);
  const [units, setUnits] = useState<IUnit[]>([]);
  const [supplier, setSupplier] = useState<IBusiness | null>(null);
  const [isOrderFormLoading, setIsOrderFormLoading] = useState<boolean>(true);
  const [isProductsLoading, setIsProductsLoading] = useState<boolean>(true);
  const [isProductDetailsLoading, setIsProductDetailsLoading] = useState<boolean>(true);
  const [isUnitLoading, setIsUnitLoading] = useState<boolean>(true);
  const [isSupplierLoading, setIsSupplierLoading] = useState<boolean>(true);

  useEffect((): void => {
    const getProducts = async () => {
      const newProducts: IProduct[] = await fetchGetCollections<IProduct>(
        ECollectionNames.PRODUCT,
      );
      setProducts([...newProducts]);
      setIsProductsLoading(false);
    }
    const getProductDetails = async () => {
      const newProductDetails: IProductDetail[] =
        await fetchGetCollections<IProductDetail>(
          ECollectionNames.PRODUCT_DETAIL,
        );
      setProductDetails([...newProductDetails]);
      setIsProductDetailsLoading(false);
    }
    const getUnits = async () => {
      const newUnits: IUnit[] = await fetchGetCollections<IUnit>(
        ECollectionNames.UNIT,
      );
      setUnits([...newUnits]);
      setIsUnitLoading(false);
    }

    const getBusinesses = async () => {
      try {
        const businesses: IBusiness[] = await fetchGetCollections<IBusiness>(
          ECollectionNames.BUSINESS,
        );
        setIsSupplierLoading(false);

        const getWarehouseReceiptApiResponse: Response =
          await getCollectionById(id, collectionName);
        const warehouseReceiptData = await getWarehouseReceiptApiResponse.json();
        setWarehouseReceipt(warehouseReceiptData);
        setIsOrderFormLoading(false);

        if (warehouseReceiptData && warehouseReceiptData.supplier_id) {
          const supplierData = businesses.find(b => b._id === warehouseReceiptData.supplier_id);
          if (supplierData) {
            setSupplier(supplierData);
          }
        }
      } catch (error) {
        console.error("Error fetching businesses:", error);
        setIsSupplierLoading(false);
      }
    };

    getProducts();
    getProductDetails();
    getUnits();
    getBusinesses();
  }, [id, warehouseReceipt.supplier_id]);

  const printInvoice = async (): Promise<void> => {
    await toPdf(invoiceRef);
  }

  const getProduct = (id: string): IProduct | undefined => {
    return products.find((product: IProduct): boolean => product._id ===
      productDetails.find((productDetail: IProductDetail): boolean =>
        productDetail._id === id
      )?.product_id
    );
  }


  const getUnit = (id: string): IUnit | undefined => {
    return units.find((unit: IUnit): boolean => unit._id === id);
  }

  const formatDate = (dateString: string | Date | undefined): string => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('vi-VN');
  }

  const getTotalPrice = (): number => warehouseReceipt.product_details.reduce(
    (accumulator: number, currentValue: IWarehouseProductDetail): number => {
      const foundUnit: IUnit | undefined = getUnit(currentValue.unit_id);
      const inputPrice = typeof currentValue.input_price === 'number' ? currentValue.input_price : 0;

      if (!foundUnit) return accumulator;

      return accumulator + inputPrice * currentValue.quantity;
    },
    0
  );

  const getTotalQuantity = (): number => warehouseReceipt.product_details.reduce(
    (accumulator: number, currentValue: IOrderFormProductDetail): number =>
      accumulator + currentValue.quantity,
    0
  );

  const getItemTotal = (item: IWarehouseProductDetail): number => {
    const price = typeof item.input_price === 'number' ? item.input_price : 0;
    return price * item.quantity;
  };

  return (
    (
      isOrderFormLoading ||
      isProductsLoading ||
      isProductDetailsLoading ||
      isUnitLoading ||
      isSupplierLoading
    )
      ? <LoadingScreen></LoadingScreen>
      : <>
        <div className="max-w-5xl mx-auto mt-4 mb-2">
          <Button
            type={EButtonType.TRANSPARENT}
            onClick={() => window.history.back()}
            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-medium rounded-lg border border-gray-300 shadow-sm"
          >
            <span className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                <path d="M19 12H5"></path>
                <path d="M12 19l-7-7 7-7"></path>
              </svg>
              Quay lại
            </span>
          </Button>
        </div>

        <div
          ref={invoiceRef}
          className="bg-white p-6 rounded-xl shadow-xl border border-gray-100 max-w-5xl mx-auto my-4"
        >
          <div className="w-full space-y-6 px-8">

            <div className="flex justify-between items-start border-b-2 border-gray-300 pb-4">
              <div className="space-y-1">
                <p className="font-bold text-xl text-gray-900">{COMPANY.name}</p>
                <p className="text-gray-700">{companyAddress}</p>
                <p className="text-gray-700">Hotline: {COMPANY.phone}</p>
              </div>
              <div className="text-right space-y-1">
                <p className="font-medium text-gray-700">Số phiếu: {id.substring(id.length - 6)}</p>
                <p className="text-gray-700">Ngày: {formatDate(warehouseReceipt.created_at)}</p>
              </div>
            </div>

            <div className="text-center py-3 border-b-2 border-gray-300">
              <h1 className="text-3xl font-bold text-gray-900">{
                translateCollectionName(collectionName)
              }</h1>
            </div>

            {/* Thông tin nhà cung cấp */}
            {supplier && (
              <div className="bg-blue-50 p-5 rounded-lg border-2 border-blue-300 mb-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="border-r border-blue-200 pr-4">
                    <h2 className="font-bold text-blue-800 text-lg mb-3 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      Thông tin nhà cung cấp
                    </h2>
                    <p className="font-medium text-gray-800 text-lg">{supplier.name}</p>
                    {supplier.address && (
                      <p className="text-gray-700 mt-2">
                        <span className="font-medium">Địa chỉ:</span> {typeof supplier.address === 'string'
                          ? supplier.address
                          : (
                              supplier.address &&
                              typeof supplier.address === 'object' &&
                              (supplier.address as any).number &&
                              (supplier.address as any).street &&
                              (supplier.address as any).ward &&
                              (supplier.address as any).district &&
                              (supplier.address as any).city
                                ? `${(supplier.address as any).number} ${(supplier.address as any).street}, ${(supplier.address as any).ward}, ${(supplier.address as any).district}, ${(supplier.address as any).city}`
                                : ''
                            )
                        }
                      </p>
                    )}
                    {supplier.email && <p className="text-gray-700 mt-1"><span className="font-medium">Email:</span> {supplier.email}</p>}
                  </div>
                  <div>
                    <h2 className="font-bold text-blue-800 text-lg mb-3 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      Chi tiết phiếu nhập kho
                    </h2>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <p className="text-gray-700"><span className="font-medium">Mã phiếu:</span> {id.substring(id.length - 6)}</p>
                        <p className="text-gray-700 mt-1"><span className="font-medium">Ngày nhập:</span> {formatDate(warehouseReceipt.created_at)}</p>
                      </div>
                      <div>
                        <p className="text-gray-700"><span className="font-medium">Số mặt hàng:</span> {warehouseReceipt.product_details.length}</p>
                        <p className="text-gray-700 mt-1"><span className="font-medium">Tổng tiền:</span> <span className="font-bold text-green-700">{formatCurrency(getTotalPrice())} đ</span></p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="overflow-x-auto border-2 border-gray-300 rounded-lg">
              <table className="w-full">
                <thead>
                  <tr className="bg-green-100">
                    <th
                      className="py-3 px-4 text-center font-bold text-gray-900 border-y-2 border-gray-300 w-[30px]"
                    >
                      #
                    </th>
                    <th
                      className="py-3 px-4 text-left font-bold text-gray-900 border-y-2 border-gray-300 w-[35%]"
                    >
                      Tên sản phẩm
                    </th>
                    <th
                      className="py-3 px-4 text-center font-bold text-gray-900 border-y-2 border-gray-300 w-[10%]"
                    >
                      Đơn vị
                    </th>
                    <th
                      className="py-3 px-4 text-center font-bold text-gray-900 border-y-2 border-gray-300 w-[10%]"
                    >
                      NSX
                    </th>
                    <th
                      className="py-3 px-4 text-center font-bold text-gray-900 border-y-2 border-gray-300 w-[10%]"
                    >
                      HSD
                    </th>
                    <th
                      className="py-3 px-4 text-right font-bold text-gray-900 border-y-2 border-gray-300 w-[10%]"
                    >
                      Giá
                    </th>
                    <th
                      className="py-3 px-4 text-right font-bold text-gray-900 border-y-2 border-gray-300 w-[10%]"
                    >
                      Số lượng
                    </th>
                    <th
                      className="py-3 px-4 text-right font-bold text-gray-900 border-y-2 border-gray-300 w-[15%]"
                    >
                      Tổng tiền
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {warehouseReceipt.product_details.map((item, index) => (
                    <tr
                      key={index}
                      className="hover:bg-gray-50 transition-colors duration-150"
                    >
                      <td
                        className="py-3 px-4 border-b-2 border-gray-300 text-gray-700 font-medium text-center"
                      >
                        {index + 1}
                      </td>
                      <td
                        className="py-3 px-4 border-b-2 border-gray-300 text-gray-900 font-medium"
                      >
                        {getProduct(item._id)?.name}
                      </td>
                      <td
                        className="py-3 px-4 border-b-2 border-gray-300 text-gray-700 font-medium text-center"
                      >
                        {getUnit(item.unit_id)?.name}
                      </td>
                      <td
                        className="py-3 px-4 border-b-2 border-gray-300 text-gray-700 font-medium text-center"
                      >
                        {formatDate((item as IWarehouseProductDetail).date_of_manufacture)}
                      </td>
                      <td
                        className="py-3 px-4 border-b-2 border-gray-300 text-gray-700 font-medium text-center"
                      >
                        {formatDate((item as IWarehouseProductDetail).expiry_date)}
                      </td>
                      <td
                        className="py-3 px-4 text-right border-b-2 border-gray-300 text-gray-700 font-medium"
                      >
                        {formatCurrency(typeof item.input_price === 'number' ? item.input_price : 0)}
                      </td>
                      <td
                        className="py-3 px-4 text-right border-b-2 border-gray-300 text-gray-700 font-medium"
                      >
                        {item.quantity}
                      </td>
                      <td
                        className="py-3 px-4 text-right border-b-2 border-gray-300 font-bold text-gray-900"
                      >
                        {formatCurrency(getItemTotal(item as IWarehouseProductDetail))}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-green-100">
                    <td colSpan={6} className="py-3 px-4 font-bold text-gray-900 border-t-2 border-gray-300">Tổng cộng</td>
                    <td className="py-3 px-4 text-right font-bold text-gray-900 border-t-2 border-gray-300">{getTotalQuantity()}</td>
                    <td className="py-3 px-4 text-right font-bold text-gray-900 border-t-2 border-gray-300">{formatCurrency(getTotalPrice())} đ</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <div className="grid grid-cols-2 gap-8 pt-8 mt-8 border-t-2 border-gray-300">
              <div className="text-center">
                <p className="font-bold text-gray-900 mb-2">NGƯỜI NHẬN</p>
                <p className="text-sm text-gray-500">(Ký, ghi rõ họ tên)</p>
                <div className="h-24"></div>
              </div>
              <div className="text-center">
                <p className="font-bold text-gray-900 mb-2">NGƯỜI GIAO</p>
                <p className="text-sm text-gray-500">(Ký, ghi rõ họ tên)</p>
                <div className="h-24"></div>
              </div>
            </div>

            <div className="text-right text-gray-700 pt-4">
              <p className="font-bold">
                {typeof COMPANY.address === 'object' && 'city' in COMPANY.address
                  ? (COMPANY.address as any).city
                  : COMPANY.address
                }, {formatDate(new Date())}
              </p>
            </div>
          </div>
        </div>

        <div className="max-w-5xl mx-auto mb-10 flex justify-end">
          <Button
            type={EButtonType.INFO}
            onClick={printInvoice}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg shadow-md"
          >
            <span className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-1">
                <polyline points="6 9 6 2 18 2 18 9"></polyline>
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                <rect x="6" y="14" width="12" height="8"></rect>
              </svg>
              In phiếu nhập kho
            </span>
          </Button>
        </div>
      </>
  )
}
