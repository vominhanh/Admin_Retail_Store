'use client'

import { Button, LoadingScreen, Text } from '@/components';
import { EButtonType } from '@/components/button/interfaces/button-type.interface';
import { COMPANY } from '@/constants/company.constant';
import { DEFAULT_ORDER_FORM } from '@/constants/order-form.constant';
import { ECollectionNames } from '@/enums';
import { IOrderForm, IOrderFormProductDetail } from '@/interfaces/order-form.interface';
import { IPageParams } from '@/interfaces/page-params.interface';
import { IProductDetail } from '@/interfaces/product-detail.interface';
import { IProduct } from '@/interfaces/product.interface';
import { IUnit } from '@/interfaces/unit.interface';
import { getCollectionById } from '@/services/api-service';
import { fetchGetCollections } from '@/utils/fetch-get-collections';
import { formatCurrency } from '@/utils/format-currency';
import { toPdf } from '@/utils/to-pdf';
import { translateCollectionName } from '@/utils/translate-collection-name';
import React, { ReactElement, use, useEffect, useRef, useState } from 'react'
import { IBusiness } from '@/interfaces/business.interface';

type collectionType = IOrderForm;
const collectionName: ECollectionNames = ECollectionNames.ORDER_FORM;
const companyAddress: string = typeof COMPANY.address === 'object'
  ? Object.values(COMPANY.address).filter(Boolean).join(', ')
  : COMPANY.address;
const date: string = new Date().toLocaleString();

function numberToWords(num: number): string {
  // Đơn giản hóa: chỉ trả về số tiền bằng số, bạn có thể thay bằng thư viện chuyển số thành chữ nếu muốn
  return num.toLocaleString('vi-VN') + ' đồng chẵn.';
}

interface IUserInfo {
  name?: string;
  phone?: string;
}

export default function PreviewOrderForm({
  params
}: Readonly<IPageParams>): ReactElement {
  const { id } = use(params);
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [orderForm, setOrderForm] = useState<collectionType>(
    DEFAULT_ORDER_FORM
  );
  const [products, setProducts] = useState<IProduct[]>([]);
  const [productDetails, setProductDetails] = useState<IProductDetail[]>([]);
  const [units, setUnits] = useState<IUnit[]>([]);
  const [isOrderFormLoading, setIsOrderFormLoading] = useState<boolean>(true);
  const [isProductsLoading, setIsProductsLoading] = useState<boolean>(true);
  const [isProductDetailsLoading, setIsProductDetailsLoading] = useState<boolean>(true);
  const [isUnitLoading, setIsUnitLoading] = useState<boolean>(true);
  const [supplier, setSupplier] = useState<IBusiness | null>(null);
  const [userInfo, setUserInfo] = useState<IUserInfo>({});

  useEffect((): void => {
    const getOrderFormById = async () => {
      const getOrderFormApiResponse: Response =
        await getCollectionById(id, collectionName);
      const getOrderFormApiJson = await getOrderFormApiResponse.json();
      setOrderForm(getOrderFormApiJson);
      setIsOrderFormLoading(false);
    }
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

    getOrderFormById();
    getProducts();
    getProductDetails();
    getUnits();
  }, [id]);

  useEffect(() => {
    const fetchSupplier = async () => {
      if (orderForm.supplier_id) {
        try {
          const res = await fetch(`/api/business/${orderForm.supplier_id}`);
          if (res.ok) {
            const data = await res.json();
            setSupplier(data);
          }
        } catch { }
      }
    };
    fetchSupplier();
  }, [orderForm.supplier_id]);

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          const accountId = data._id;
          if (accountId) {
            const userRes = await fetch(`/api/user/account/${accountId}`);
            if (userRes.ok) {
              const userData = await userRes.json();
              setUserInfo({
                name: userData.name,
                phone: userData.phone
              });
            }
          }
        }
      } catch { }
    };
    fetchUserInfo();
  }, []);

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

  const getProductDetail = (id: string): IProductDetail | undefined => {
    return productDetails.find((productDetail: IProductDetail): boolean =>
      productDetail._id === id
    );
  }

  const getUnit = (id: string): IUnit | undefined => {
    return units.find((unit: IUnit): boolean => unit._id === id);
  }

  const getTotalPrice = () => orderForm.product_details.reduce(
    (accumulator: number, currentValue: IOrderFormProductDetail): number => {
      const foundProduct: IProduct | undefined = getProduct(currentValue._id);
      const foundUnit: IUnit | undefined = getUnit(currentValue.unit_id);

      if (!foundProduct || !foundUnit)
        return 0;

      return accumulator + foundProduct.input_price * currentValue.quantity * foundUnit.equal;
    },
    0
  );

  const getTotalQuantity = (): number => orderForm.product_details.reduce(
    (accumulator: number, currentValue: IOrderFormProductDetail): number =>
      accumulator + currentValue.quantity,
    0
  );

  return (
    (
      isOrderFormLoading ||
      isProductsLoading ||
      isProductDetailsLoading ||
      isUnitLoading
    )
      ? <LoadingScreen></LoadingScreen>
      : <>
        <div ref={invoiceRef} className="max-w-3xl mx-auto my-6 bg-white p-8 rounded-2xl shadow-xl border border-gray-200">
          <div className="text-center text-lg">
            <div className="font-bold">CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM</div>
            <div className="font-bold underline">Độc lập – Tự do – Hạnh phúc</div>
            <div className="my-2 font-bold text-xl">PHIẾU ĐẶT HÀNG</div>
            <div className="italic">Số: {orderForm._id?.substring(orderForm._id.length - 6) || '......'}</div>
          </div>
          <div className="mt-4 text-lg ">
            <span className="font-bold">Kính gửi:</span> Công ty {supplier?.name || '....................................................'}
          </div>
          <div className="mt-2 text-lg">
            Công ty của chúng tôi có nhu cầu đặt hàng tại Quý công ty theo mẫu yêu cầu.
          </div>
          <div className="mt-2 text-lg">
            <b>Liên hệ:</b> {supplier?.phone || '....................................................'}
          </div>
          <div className="mt-2 text-lg ">
            <b>Nội dung đặt hàng như sau:</b>
          </div>
          <div className="mt-4">
            <table className="w-full border border-gray-400 text-lg">
              <thead>
                <tr className="bg-gray-100 text-center">
                  <th className="border border-gray-400">STT</th>
                  <th className="border border-gray-400">Tên mặt hàng</th>
                  <th className="border border-gray-400">ĐVT</th>
                  <th className="border border-gray-400">Số lượng</th>
                  <th className="border border-gray-400">Đơn giá</th>
                  <th className="border border-gray-400">Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {orderForm.product_details.map((item, idx) => {
                  const product = products.find(p => p._id === item._id);
                  const unit = units.find(u => u._id === item.unit_id);
                  const price = typeof item.input_price === 'number' ? item.input_price : (product?.input_price || 0);
                  return (
                    <tr key={idx} className="text-center">
                      <td className="border border-gray-400">{idx + 1}</td>
                      <td className="border border-gray-400 text-left">{product?.name || ''}</td>
                      <td className="border border-gray-400">{unit?.name || ''}</td>
                      <td className="border border-gray-400">{item.quantity}</td>
                      <td className="border border-gray-400 text-right">{formatCurrency(price)}</td>
                      <td className="border border-gray-400 text-right">{formatCurrency(price * item.quantity)}</td>
                    </tr>
                  )
                })}
                <tr>
                  <td colSpan={5} className="border border-gray-400 py-1 px-2 text-right font-bold">Tổng cộng:</td>
                  <td className="border border-gray-400 py-1 px-2 text-right font-bold">
                    {formatCurrency(orderForm.product_details.reduce((sum, item) => sum + (typeof item.input_price === 'number' ? item.input_price : 0) * item.quantity, 0))}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div className="mt-2 text-lg"><span className="font-bold ">Thông tin người đặt:</span> {userInfo.name}</div>
          <div className="mt-2 text-lg"><span className="font-bold ">Liên hệ:</span> {'0369445470'}</div>
          <div className="text-lg">- Thanh toán bằng tiền mặt hoặc chuyển khoản</div>
          <div className="text-lg">- Thanh toán trước 50% giá trị hợp đồng, 50% còn lại thanh toán sau khi giao hàng.</div>
          <div className="mt-4 mb-4 grid grid-cols-2 gap-8 pt-8 border-t border-gray-200 text-center text-lg">
            <div>
              <div className="font-bold mt-9">Người đặt</div>
              <div className="italic">(Ký, họ tên)</div>
              <div className="h-16"></div>
            </div>
            <div>
              <div className="mb-2 italic">TP.HCM, ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}</div>
              <div className="font-bold mt-2">Người nhận</div>
              <div className="italic">(Ký, họ tên)</div>
              <div className="h-16"></div>
            </div>
          </div>
        </div>
        <div className="max-w-3xl mx-auto mb-10 flex flex-col sm:flex-row justify-center items-center gap-4">
          <Button
            type={EButtonType.INFO}
            onClick={() => window.history.back()}
            className="flex-1 min-w-[180px] text-lg px-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl shadow-lg transition-all duration-200 flex items-center justify-center h-[64px]"
          >
            Quay lại
          </Button>
          <Button
            type={EButtonType.INFO}
            onClick={printInvoice}
            className="flex-1 min-w-[180px] text-lg px-8 py-4 bg-blue-700 hover:bg-blue-800 text-white font-bold rounded-2xl shadow-lg transition-all duration-200 flex items-center justify-center gap-2 h-[64px]"
          >
            In phiếu đặt hàng
          </Button>
          <a
            href={`https://zalo.me/${supplier?.phone || ''}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 min-w-[180px] text-lg px-8 py-4 bg-green-500 hover:bg-green-600 text-white font-bold rounded-2xl shadow-lg flex items-center justify-center gap-2 transition-all duration-200 h-[64px]"
          >
            Đến Zalo nhà cung cấp
          </a>

        </div>
      </>
  )
}

