'use client';

import { useEffect, useState } from 'react';
import { IProduct, IProductDetail } from '@/interfaces';
import { ENotificationType } from '@/components/notify/notification/notification';
import useNotificationsHook from '@/hooks/notifications-hook';
import dynamic from 'next/dynamic';


const DynamicReactBarcode = dynamic(() => import('react-barcode'), { ssr: false });

interface ExpirationInfo {
  product: IProduct;
  detail: IProductDetail;
  daysExpired?: number;
  daysLeft?: number;
}

export default function ExpirationPage() {
  const [loading, setLoading] = useState(false);
  const [expired, setExpired] = useState<ExpirationInfo[]>([]);
  const [expiring, setExpiring] = useState<ExpirationInfo[]>([]);
  const [] = useState(false);
  const [cancelSuccess] = useState(false);
  const [] = useState(false);
  const [cancelExpiringSuccess] = useState(false);
  const [cancellingId, setCancellingId] = useState<string | null>(null);
  const [cancelSuccessMsg, setCancelSuccessMsg] = useState<string | null>(null);
  const [employee, setEmployee] = useState<string>('');
  const [employeeName, setEmployeeName] = useState<string>('');
  const { createNotification, notificationElements } = useNotificationsHook();


  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetch('/api/product').then(res => res.json()),
      fetch('/api/product-detail').then(res => res.json())
    ]).then(([products, details]: [IProduct[], IProductDetail[]]) => {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const expiredList: ExpirationInfo[] = [];
      const expiringList: ExpirationInfo[] = [];

      for (const product of products) {
        for (const detail of details.filter(d => d.product_id === product._id)) {
          const expiry = new Date(detail.expiry_date);
          expiry.setHours(0, 0, 0, 0);
          const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          if (detail.inventory > 0) {
            if (expiry < today) {
              expiredList.push({ product, detail, daysExpired: -diffDays });
            } else if (diffDays <= 30) {
              expiringList.push({ product, detail, daysLeft: diffDays });
            }
          }
        }
      }

      setExpired(expiredList.sort((a, b) => (b.daysExpired ?? 0) - (a.daysExpired ?? 0)));
      setExpiring(expiringList.sort((a, b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0)));
      setLoading(false);
    });

    // Lấy employee_id từ API giống trang order
    const fetchEmployee = async () => {
      try {
        const response = await fetch('/api/auth/me');
        if (!response.ok) {
          throw new Error('Failed to fetch employee');
        }
        const data = await response.json();
        setEmployee(data._id || '');

        // Lấy thêm thông tin tên nhân viên
        try {
          const userResponse = await fetch(`/api/user/account/${data._id}`);
          if (userResponse.ok) {
            const userData = await userResponse.json();
            setEmployeeName(userData.name || 'Chưa xác định');
          }
        } catch (err) {
          console.error('Error fetching user details:', err);
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (err) {
        setEmployee('');
      }
    };
    fetchEmployee();
  }, []);

  // Hàm cập nhật chi tiết sản phẩm sau khi hủy
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const updateProductDetail = async (detailId: string, currentQuantity: number) => {
    try {
      // Lấy thông tin chi tiết hiện tại trước
      const getDetailResponse = await fetch(`/api/product-detail/${detailId}`);
      if (!getDetailResponse.ok) {
        console.error('Không thể lấy thông tin chi tiết sản phẩm:', await getDetailResponse.text());
        return;
      }

      const detailData = await getDetailResponse.json();
      const inputQuantity = detailData.input_quantity || 0;

      // Gửi yêu cầu cập nhật với output_quantity bằng input_quantity để inventory = 0
      const response = await fetch(`/api/product-detail/${detailId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          output_quantity: inputQuantity, // Đảm bảo output = input để inventory = 0
          user_id: employee,
          user_name: employeeName
        })
      });

      if (!response.ok) {
        console.error('Không thể cập nhật chi tiết sản phẩm:', await response.text());
      } else {
        console.log('Đã cập nhật thành công chi tiết sản phẩm:', detailId);
      }
    } catch (error) {
      console.error('Lỗi khi cập nhật chi tiết sản phẩm:', error);
    }
  };

  const handleCancelSingle = async (product: IProduct, detail: IProductDetail, isExpired: boolean) => {
    setCancellingId(detail._id);
    const items = [{
      product_id: product._id,
      quantity: detail.inventory,
      price: 0
    }];
    try {
      const res = await fetch('/api/order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employee_id: employee,
          items,
          total_amount: 0,
          customer_payment: 0,
          payment_method: 'cash',
          payment_status: true,
          note: `Hủy đơn hàng ${isExpired ? 'hết hạn' : 'sắp hết hạn'}`,
          status: 'cancelled'
        })
      });
      if (res.ok) {
        // Cập nhật chi tiết sản phẩm
        await updateProductDetail(detail._id, detail.inventory);

        // Tạo lịch sử xuất kho (stock history)
        try {
          await fetch('/api/stock-history', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              product_id: product._id,
              batch_number: detail.batch_number,
              action: 'export',
              quantity: detail.inventory,
              note: `Hủy hàng ${isExpired ? 'hết hạn' : 'sắp hết hạn'}: ${product.name}`,
              user_id: employee,
              user_name: employeeName
            })
          });
        } catch (err) {
          console.error('Lỗi khi tạo lịch sử xuất kho:', err);
        }

        // Hiển thị thông báo thành công
        createNotification({
          children: `Đã hủy thành công sản phẩm "${product.name}"!`,
          type: ENotificationType.SUCCESS,
          isAutoClose: true,
          id: Math.random(),
        });

        setCancelSuccessMsg('Đã hủy thành công!');

        // Cập nhật lại danh sách sản phẩm
        Promise.all([
          fetch('/api/product').then(res => res.json()),
          fetch('/api/product-detail').then(res => res.json())
        ]).then(([productsData, detailsData]: [IProduct[], IProductDetail[]]) => {
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          const newExpiredList: ExpirationInfo[] = [];
          const newExpiringList: ExpirationInfo[] = [];

          for (const product of productsData) {
            for (const detail of detailsData.filter(d => d.product_id === product._id)) {
              const expiry = new Date(detail.expiry_date);
              expiry.setHours(0, 0, 0, 0);
              const diffDays = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
              if (detail.inventory > 0) {
                if (expiry < today) {
                  newExpiredList.push({ product, detail, daysExpired: -diffDays });
                } else if (diffDays <= 30) {
                  newExpiringList.push({ product, detail, daysLeft: diffDays });
                }
              }
            }
          }

          setExpired(newExpiredList.sort((a, b) => (b.daysExpired ?? 0) - (a.daysExpired ?? 0)));
          setExpiring(newExpiringList.sort((a, b) => (a.daysLeft ?? 0) - (b.daysLeft ?? 0)));

          // Xóa thông báo hủy thành công sau 1.2 giây
          setTimeout(() => {
            setCancelSuccessMsg(null);
          }, 1200);
        });
      } else {
        const errorData = await res.json();
        createNotification({
          children: errorData.error || 'Có lỗi khi hủy sản phẩm!',
          type: ENotificationType.ERROR,
          isAutoClose: true,
          id: Math.random(),
        });
        alert('Có lỗi khi hủy sản phẩm!');
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (e) {
      createNotification({
        children: 'Có lỗi khi hủy sản phẩm!',
        type: ENotificationType.ERROR,
        isAutoClose: true,
        id: Math.random(),
      });
      alert('Có lỗi khi hủy sản phẩm!');
    } finally {
      setCancellingId(null);
    }
  };



  return (
    <div className="min-h-screen bg-white px-4 py-6">
      <div className="max-w-7xl mx-auto">
        <h1 className="flex items-center justify-center gap-3 text-3xl font-bold text-center mb-8 text-gray-800">
          <span className="text-gray-600">⏱️</span>
          Báo cáo hạn sử dụng sản phẩm
        </h1>
        {loading ? (
          <div className="flex justify-center items-center h-48 text-lg text-blue-600">
            Đang tải dữ liệu...
          </div>
        ) : (
          <div className="space-y-10">
            {/* Expired Products */}
            <section className="bg-white rounded-xl shadow-md overflow-hidden border border-slate-200">
              <div className="border-b border-slate-200 bg-gradient-to-r from-red-50 to-red-100 py-4 px-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-red-600 flex items-center gap-2">
                    <span className="flex items-center justify-center h-7 w-7 rounded-full bg-red-100 text-red-500">🔴</span>
                    Sản phẩm đã hết hạn ({expired.length})
                  </h2>
                </div>
                {cancelSuccess && (
                  <div className="mt-2 text-green-600 font-semibold bg-green-50 px-3 py-2 rounded-lg">Đã hủy hàng hết hạn thành công!</div>
                )}
              </div>

              <div className="overflow-x-auto p-4">
                <table className="w-full border-collapse border border-slate-200 rounded-lg shadow-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left p-3 text-gray-600 border border-slate-200 bg-slate-100">Barcode</th>
                      <th className="text-left p-3 text-gray-600 border border-slate-200 bg-slate-100">Tên sản phẩm</th>
                      <th className="text-center p-3 text-gray-600 border border-slate-200 bg-slate-100">Hạn sử dụng</th>
                      <th className="text-center p-3 text-gray-600 border border-slate-200 bg-slate-100">SL Nhập</th>
                      <th className="text-center p-3 text-gray-600 border border-slate-200 bg-slate-100">SL Xuất</th>
                      <th className="text-center p-3 text-gray-600 border border-slate-200 bg-slate-100">Tồn kho</th>
                      <th className="text-center p-3 text-gray-600 border border-slate-200 bg-slate-100">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expired.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-4 text-center text-gray-500 italic border border-slate-200">
                          Không có sản phẩm nào đã hết hạn.
                        </td>
                      </tr>
                    ) : (
                      expired.map(({ product, detail, daysExpired }) => (
                        <tr key={detail._id} className="hover:bg-red-50 border border-slate-200">
                          <td className="px-4 py-3 whitespace-nowrap text-center border border-slate-200">
                            <div className="flex justify-center">
                              <DynamicReactBarcode
                                value={detail.batch_number}
                                height={40}
                                width={1.5}
                                fontSize={12}
                                displayValue={true}
                                margin={0}
                              />
                            </div>
                          </td>
                          <td className="p-3 border border-slate-200">
                            <span className="font-medium">{product.name}</span>
                          </td>
                          <td className="p-3 text-center border border-slate-200">
                            <div className="font-medium">{new Date(detail.expiry_date).toLocaleDateString('vi-VN')}</div>
                            <div className="text-sm text-red-500 font-medium">({daysExpired} ngày trước)</div>
                          </td>
                          <td className="p-3 text-center font-medium border border-slate-200">
                            {detail.input_quantity}
                          </td>
                          <td className="p-3 text-center font-medium border border-slate-200">
                            {detail.output_quantity}
                          </td>
                          <td className="p-3 text-center font-medium border border-slate-200">
                            {detail.inventory}
                          </td>
                          <td className="p-3 text-center border border-slate-200">
                            <button
                              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm font-semibold disabled:opacity-60 shadow-sm transition-all"
                              onClick={() => handleCancelSingle(product, detail, true)}
                              disabled={cancellingId === detail._id}
                            >
                              {cancellingId === detail._id ? 'Đang hủy hàng...' : 'Hủy hàng'}
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                    {cancelSuccessMsg && (
                      <tr><td colSpan={7} className="p-2 text-green-600 text-center font-semibold border border-slate-200 bg-green-50">{cancelSuccessMsg}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Expiring Soon */}
            <section className="bg-white rounded-xl shadow-md overflow-hidden border border-slate-200">
              <div className="border-b border-slate-200 bg-gradient-to-r from-yellow-50 to-yellow-100 py-4 px-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-yellow-600 flex items-center gap-2">
                    <span className="flex items-center justify-center h-7 w-7 rounded-full bg-yellow-100 text-yellow-500">🟡</span>
                    Sản phẩm sắp hết hạn ({expiring.length})
                  </h2>
                </div>
                {cancelExpiringSuccess && (
                  <div className="mt-2 text-green-600 font-semibold bg-green-50 px-3 py-2 rounded-lg">Đã hủy hàng sắp hết hạn thành công!</div>
                )}
              </div>

              <div className="overflow-x-auto p-4">
                <table className="w-full border-collapse border border-slate-200 rounded-lg shadow-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="text-left p-3 text-gray-600 border border-slate-200 bg-slate-100">Barcode</th>
                      <th className="text-left p-3 text-gray-600 border border-slate-200 bg-slate-100">Tên sản phẩm</th>
                      <th className="text-center p-3 text-gray-600 border border-slate-200 bg-slate-100">Hạn sử dụng</th>
                      <th className="text-center p-3 text-gray-600 border border-slate-200 bg-slate-100">SL Nhập</th>
                      <th className="text-center p-3 text-gray-600 border border-slate-200 bg-slate-100">SL Xuất</th>
                      <th className="text-center p-3 text-gray-600 border border-slate-200 bg-slate-100">Tồn kho</th>
                      {/* <th className="text-center p-3 text-gray-600 border border-slate-200 bg-slate-100">Thao tác</th> */}
                    </tr>
                  </thead>
                  <tbody>
                    {expiring.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="p-4 text-center text-gray-500 italic border border-slate-200">
                          Không có sản phẩm nào sắp hết hạn.
                        </td>
                      </tr>
                    ) : (
                      expiring.map(({ product, detail, daysLeft }) => (
                        <tr key={detail._id} className="hover:bg-yellow-50 border border-slate-200">
                          <td className="px-4 py-3 whitespace-nowrap text-center border border-slate-200">
                            <div className="flex justify-center">
                              <DynamicReactBarcode
                                value={detail.batch_number}
                                height={40}
                                width={1.5}
                                fontSize={12}
                                displayValue={true}
                                margin={0}
                              />
                            </div>
                          </td>
                          <td className="p-3 border border-slate-200">
                            <span className="font-medium">{product.name}</span>
                          </td>
                          <td className="p-3 text-center border border-slate-200">
                            <div className="font-medium">{new Date(detail.expiry_date).toLocaleDateString('vi-VN')}</div>
                            <div className="text-sm text-yellow-600 font-medium">({daysLeft} ngày nữa)</div>
                          </td>
                          <td className="p-3 text-center font-medium border border-slate-200">
                            {detail.input_quantity}
                          </td>
                          <td className="p-3 text-center font-medium border border-slate-200">
                            {detail.output_quantity}
                          </td>
                          <td className="p-3 text-center font-medium border border-slate-200">
                            {detail.inventory}
                          </td>
                          {/* <td className="p-3 text-center border border-slate-200">
                            <button
                              className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 text-sm font-semibold disabled:opacity-60 shadow-sm transition-all"
                              onClick={() => handleCancelSingle(product, detail, false)}
                              disabled={cancellingId === detail._id}
                            >
                              {cancellingId === detail._id ? 'Đang hủy hàng...' : 'Hủy hàng'}
                            </button>
                          </td> */}
                        </tr>
                      ))
                    )}
                    {cancelSuccessMsg && (
                      <tr><td colSpan={7} className="p-2 text-green-600 text-center font-semibold border border-slate-200 bg-green-50">{cancelSuccessMsg}</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}
      </div>
      {notificationElements}
    </div>
  );
}
