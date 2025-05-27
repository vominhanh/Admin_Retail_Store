/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import { Button } from '@/components'
import React, { useEffect, useState } from 'react'
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { formatCurrency } from '@/utils/format';
import PaymentModal from '@/components/PaymentModal';
import { IProductDetail } from '@/interfaces/product-detail.interface';
import { generatePDF } from '@/utils/generatePDF';

interface OrderItem {
  product_id: string;
  quantity: number;
  price: number;
}

interface Order {
  _id: string;
  order_code: string;
  employee_id: string;
  items: OrderItem[];
  total_amount: number;
  payment_method: string;
  payment_status: boolean;
  note?: string;
  created_at: Date;
  updated_at: Date;
}

const ImportOrderList = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [sortField, setSortField] = useState<'date' | 'price'>('date');
  const [dateFilter, setDateFilter] = useState<'range'>('range');
  const [fromDate, setFromDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [toDate, setToDate] = useState<string>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  });
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'pending'>('pending');
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedOrderId, setSelectedOrderId] = useState<string>('');
  const [selectedOrderAmount, setSelectedOrderAmount] = useState<number>(0);
  const [selectedOrderItems, setSelectedOrderItems] = useState<any[]>([]);
  const [showBillModal, setShowBillModal] = useState(false);
  const [billData, setBillData] = useState<any>(null);

  const fetchOrders = async (status: 'all' | 'completed' | 'pending' = statusFilter) => {
    setLoading(true);
    try {
      let url = `/api/order?limit=500&t=${Date.now()}`;
      if (status !== 'all') {
        url += `&status=${status}`;
      }
      const res = await fetch(url, { cache: 'no-store' });
      const data = await res.json();
      if (Array.isArray(data)) {
        setOrders(data);
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    }
    setLoading(false);
  };

  // Kiểm tra nếu có dữ liệu hóa đơn từ thanh toán MoMo
  useEffect(() => {
    // Kiểm tra query param showBill từ callback MoMo
    const showBill = searchParams.get('showBill');

    // Kiểm tra localStorage có dữ liệu hóa đơn không
    const storedBillData = localStorage.getItem('show_bill_after_payment');

    if (showBill === 'true' && storedBillData) {
      try {
        const parsedBillData = JSON.parse(storedBillData);
        setBillData(parsedBillData);
        setShowBillModal(true);

        // Xóa dữ liệu sau khi đã hiển thị
        localStorage.removeItem('show_bill_after_payment');

        // Xóa query param
        const url = new URL(window.location.href);
        url.searchParams.delete('showBill');
        window.history.replaceState({}, '', url);
      } catch (error) {
        console.error('Lỗi khi xử lý dữ liệu hóa đơn:', error);
      }
    }

    fetchOrders(statusFilter);
  }, [statusFilter, searchParams]);

  const handleCreateOrder = () => {
    router.push('/home/order/create');
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa đơn hàng này không?')) {
      try {
        console.log('Đang gửi yêu cầu xóa đơn hàng:', orderId);

        const response = await fetch(`/api/order/${orderId}?t=${Date.now()}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json'
          }
        });

        console.log('Status code:', response.status);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error('Thông tin lỗi từ server:', errorData);
          throw new Error(`Không thể xóa đơn hàng: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        console.log('Kết quả xóa đơn hàng:', result);

        // Cập nhật trạng thái để loại bỏ đơn hàng đã xóa
        setOrders(orders.filter(order => order._id !== orderId));
        alert('Đã xóa đơn hàng thành công!');
      } catch (err) {
        console.error('Error deleting order:', err);
        alert('Đã xảy ra lỗi khi xóa đơn hàng: ' + (err instanceof Error ? err.message : 'Lỗi không xác định'));
      }
    }
  };

  // Hàm lọc theo ngày được cập nhật
  const filterByDate = (order: Order) => {
    const orderDate = new Date(order.created_at);
    const from = new Date(fromDate);
    const to = new Date(toDate);
    from.setHours(0, 0, 0, 0);
    to.setHours(23, 59, 59, 999);
    return orderDate >= from && orderDate <= to;
  };

  // Hàm lọc theo trạng thái
  const filterByStatus = (order: Order) => {
    switch (statusFilter) {
      case 'completed':
        return order.payment_status === true;
      case 'pending':
        return order.payment_status === false;
      default:
        return true;
    }
  };

  // Hàm sắp xếp đơn hàng
  const sortOrders = (orders: Order[]) => {
    return [...orders].sort((a, b) => {
      if (sortField === 'date') {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return sortOrder === 'asc' ? dateA - dateB : dateB - dateA;
      } else {
        // Sắp xếp theo giá
        return sortOrder === 'asc' ? a.total_amount - b.total_amount : b.total_amount - a.total_amount;
      }
    });
  };

  // Cập nhật hàm handleReset
  const handleReset = () => {
    setDateFilter('range');
    setFromDate(new Date().toISOString().split('T')[0]);
    setToDate(new Date().toISOString().split('T')[0]);
    setStatusFilter('pending');
    setSortOrder('asc');
    setSortField('date');
    setSearchTerm('');
  };

  // Áp dụng các bộ lọc và sắp xếp
  const filteredOrders = sortOrders(orders.filter(filterByDate).filter(filterByStatus));

  // Tìm kiếm đơn hàng theo mã
  const searchedOrders = filteredOrders.filter(order => {
    if (!searchTerm.trim()) return true;

    const searchTermLower = searchTerm.toLowerCase().trim();
    return order.order_code.toLowerCase().includes(searchTermLower);
  });

  const openPaymentModal = async (orderId: string, amount: number) => {
    setSelectedOrderId(orderId);
    setSelectedOrderAmount(amount);
    setSelectedOrderItems([]); // Đặt lại danh sách sản phẩm

    // Lấy thông tin chi tiết đơn hàng với thông tin sản phẩm
    try {
      // Bước 1: Lấy thông tin đơn hàng
      const response = await fetch(`/api/order/${orderId}?t=${Date.now()}`);
      if (!response.ok) {
        throw new Error('Không thể lấy thông tin đơn hàng');
      }

      const orderData = await response.json();
      console.log("Dữ liệu đơn hàng:", orderData);

      if (!orderData.items || orderData.items.length === 0) {
        console.warn("Đơn hàng không có sản phẩm nào");
        setIsModalOpen(true);
        return;
      }

      // Bước 2: Lấy thông tin chi tiết từng sản phẩm
      const itemsWithProductDetails = await Promise.all(
        orderData.items.map(async (item: IProductDetail) => {
          try {
            if (!item.product_id) {
              console.warn("Sản phẩm không có ID:", item);
              return item;
            }

            const productResponse = await fetch(`/api/product/${item.product_id}?t=${Date.now()}`);
            if (!productResponse.ok) {
              console.warn(`Không thể lấy thông tin sản phẩm ${item.product_id}`, productResponse.statusText);
              return item;
            }

            const productData = await productResponse.json();
            console.log(`Dữ liệu sản phẩm ${item.product_id}:`, productData);

            return {
              ...item,
              product: {
                _id: productData._id,
                name: productData.name,
                image_links: productData.image_links || []
              }
            };
          } catch (error) {
            console.error(`Lỗi khi lấy thông tin sản phẩm ${item.product_id}:`, error);
            return item;
          }
        })
      );

      console.log("Chi tiết sản phẩm đã lấy:", itemsWithProductDetails);
      setSelectedOrderItems(itemsWithProductDetails);
    } catch (error) {
      console.error("Lỗi khi lấy thông tin đơn hàng:", error);
      alert("Không thể lấy thông tin chi tiết đơn hàng. Vui lòng thử lại sau.");
    }

    setIsModalOpen(true);
  };

  const closePaymentModal = () => {
    setIsModalOpen(false);
    setSelectedOrderItems([]);
  };

  const handlePaymentComplete = () => {
    // Refresh danh sách đơn hàng
    fetchOrders(statusFilter);
    setIsModalOpen(false);
    alert('Thanh toán thành công!');
  };

  const closeBillModal = () => {
    setShowBillModal(false);
    setBillData(null);
  };

  const printBill = () => {
    if (billData) {
      generatePDF(billData);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-[1400px] mx-auto p-8">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 mb-3">
              Danh sách đơn hàng
            </h1>
            <p className="text-slate-500 text-lg">
              Quản lý đơn hàng
            </p>
          </div>
          <div className="flex gap-4">
            <Button
              onClick={handleCreateOrder}
              className="flex items-center gap-2.5 px-6 py-3 bg-white border-2 border-blue-600 rounded-xl hover:border-blue-700 hover:bg-blue-50 transition-all duration-200 shadow-lg shadow-blue-500/20"
            >
              <Image
                src="/icons/plus-black.svg"
                alt="plus"
                width={20}
                height={20}
                className="text-blue-600"
                priority
              />
              <span className="font-semibold text-blue-600">Thêm đơn hàng</span>
            </Button>
          </div>
        </header>

        <div className="space-y-4 mb-8">
          <div className="w-full">
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Nhập mã đơn hàng (VD: HD-010224-0001)"
                className="w-full px-5 py-3 pl-12 bg-white border-2 border-slate-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all duration-200 text-slate-600 placeholder:text-slate-400"
              />
              <Image
                src="/icons/search.svg"
                alt="search"
                width={20}
                height={20}
                className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"
                priority
              />
            </div>
          </div>

          <div className="flex gap-4">
            {/* Bộ lọc khoảng ngày */}
            <div className="flex flex-1">
              <div className="flex gap-2 w-full">
                <div className="relative flex items-center gap-2 px-5 py-3 bg-white border border-blue-500 text-blue-600 rounded-xl transition-all duration-200 font-medium flex-1">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="text-blue-500"
                  >
                    <path d="M19 4H5C3.89543 4 3 4.89543 3 6V20C3 21.1046 3.89543 22 5 22H19C20.1046 22 21 21.1046 21 20V6C21 4.89543 20.1046 4 19 4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M16 2V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M8 2V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M3 10H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => {
                      const newFromDate = e.target.value;
                      setFromDate(newFromDate);
                      // Nếu toDate <= fromDate thì cập nhật toDate = fromDate + 1 ngày
                      if (newFromDate >= toDate) {
                        const nextDay = new Date(newFromDate);
                        nextDay.setDate(nextDay.getDate() + 1);
                        setToDate(nextDay.toISOString().split('T')[0]);
                      }
                    }}
                    className="flex-1 border-0 bg-transparent focus:outline-none focus:ring-0 text-blue-600 font-medium"
                  />
                </div>
                <span className="self-center font-semibold text-slate-500">-</span>
                <div className="relative flex items-center gap-2 px-5 py-3 bg-white border border-blue-500 text-blue-600 rounded-xl transition-all duration-200 font-medium flex-1">
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="text-blue-500"
                  >
                    <path d="M19 4H5C3.89543 4 3 4.89543 3 6V20C3 21.1046 3.89543 22 5 22H19C20.1046 22 21 21.1046 21 20V6C21 4.89543 20.1046 4 19 4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M16 2V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M8 2V6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M3 10H21" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  <input
                    type="date"
                    value={toDate}
                    min={(() => {
                      const minDate = new Date(fromDate);
                      minDate.setDate(minDate.getDate() + 1);
                      return minDate.toISOString().split('T')[0];
                    })()}
                    onChange={(e) => {
                      const newToDate = e.target.value;
                      // Chỉ cho phép chọn ngày lớn hơn fromDate
                      if (newToDate > fromDate) {
                        setToDate(newToDate);
                      } else {
                        alert('Ngày kết thúc phải lớn hơn ngày bắt đầu ít nhất 1 ngày!');
                      }
                    }}
                    className="flex-1 border-0 bg-transparent focus:outline-none focus:ring-0 text-blue-600 font-medium"
                  />
                </div>
              </div>
            </div>

            <div className="relative group flex-1">
              <Button
                onClick={(event?: React.MouseEvent<HTMLButtonElement>) => {
                  event?.stopPropagation();
                  setStatusFilter(prev => prev === 'pending' ? 'completed' : prev === 'completed' ? 'all' : 'pending');
                }}
                className={`w-full flex items-center gap-2 px-5 py-3 bg-white border ${statusFilter !== 'all' ? 'border-blue-500 text-blue-600' : 'border-slate-200 text-slate-700'} rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 font-medium justify-center`}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className={statusFilter !== 'all' ? 'text-blue-500' : 'text-slate-500'}
                >
                  <path
                    d="M9 11L12 14L22 4"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M21 12V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H5C4.46957 21 3.96086 20.7893 3.58579 20.4142C3.21071 20.0391 3 19.5304 3 19V5C3 4.46957 3.21071 3.96086 3.58579 3.58579C3.96086 3.21071 4.46957 3 5 3H16"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>{statusFilter === 'pending' ? 'Chưa hoàn thành' : statusFilter === 'completed' ? 'Hoàn thành' : 'Tất cả'}</span>
              </Button>
            </div>

            {/* Button sắp xếp theo thời gian: luôn hiển thị */}
            <div className="relative group flex-1">
              <Button
                onClick={(event?: React.MouseEvent<HTMLButtonElement>) => {
                  event?.stopPropagation();
                  if (sortField === 'date') {
                    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                  } else {
                    setSortField('date');
                    setSortOrder('desc');
                  }
                }}
                className={`w-full flex items-center gap-2 px-5 py-3 bg-white border ${sortField === 'date' ? 'border-blue-500 text-blue-600' : 'border-slate-200 text-slate-700'} rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 font-medium justify-center`}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className={sortField === 'date' ? 'text-blue-500' : 'text-slate-500'}
                >
                  <path
                    d="M4 17L8 21L12 17"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M4 7L8 3L12 7"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M8 3V21"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>
                  Sắp xếp theo thời gian {sortField === 'date' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                </span>
              </Button>
            </div>

            {/* Button sắp xếp theo giá: luôn hiển thị */}
            <div className="relative group flex-1">
              <Button
                onClick={(event?: React.MouseEvent<HTMLButtonElement>) => {
                  event?.stopPropagation();
                  if (sortField === 'price') {
                    setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
                  } else {
                    setSortField('price');
                    setSortOrder('desc');
                  }
                }}
                className={`w-full flex items-center gap-2 px-5 py-3 bg-white border ${sortField === 'price' ? 'border-blue-500 text-blue-600' : 'border-slate-200 text-slate-700'} rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all duration-200 font-medium justify-center`}
              >
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  className={sortField === 'price' ? 'text-blue-500' : 'text-slate-500'}
                >
                  <path
                    d="M4 17L8 21L12 17"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M4 7L8 3L12 7"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M8 3V21"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M16 7H20"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M16 12H20"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M16 17H20"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <span>
                  Sắp xếp theo giá {sortField === 'price' ? (sortOrder === 'asc' ? '↑' : '↓') : ''}
                </span>
              </Button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-xl shadow-slate-200/20 overflow-hidden">
            <div className="max-h-[490px]">
              <table className="w-full">
                <thead className="sticky top-0 bg-white z-10">
                  <tr className="border-b-2 border-slate-100">
                    <th className="px-8 py-5 text-left font-semibold text-slate-600">Mã đơn xuất</th>
                    <th className="px-8 py-5 text-left font-semibold text-slate-600">Ngày cập nhật</th>
                    <th className="px-8 py-5 text-left font-semibold text-slate-600">Trạng thái</th>
                    <th className="px-8 py-5 text-right font-semibold text-slate-600">Thành tiền</th>
                    {/* <th className="px-8 py-5 text-center font-semibold text-slate-600">Hành động</th> */}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {/* Skeleton loader - hiển thị 5 dòng loading placeholder */}
                  {Array.from({ length: 5 }).map((_, index) => (
                    <tr key={`skeleton-${index}`} className="animate-pulse">
                      <td className="px-8 py-5">
                        <div className="h-5 bg-slate-200 rounded w-32"></div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="h-5 bg-slate-200 rounded w-40"></div>
                      </td>
                      <td className="px-8 py-5">
                        <div className="h-7 bg-slate-200 rounded-full w-28"></div>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <div className="h-5 bg-slate-200 rounded w-24 ml-auto"></div>
                      </td>
                      <td className="px-8 py-5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="h-9 bg-slate-200 rounded w-32"></div>
                          <div className="h-9 bg-slate-200 rounded-full w-9"></div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-8 py-5 border-t-2 border-slate-100 bg-slate-50">
              <div className="text-sm text-slate-400">Đang tải dữ liệu...</div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border-2 border-slate-200 shadow-xl shadow-slate-200/20 overflow-hidden">
            <div className="max-h-[490px] overflow-y-auto scrollbar-custom">
              <style jsx global>{`
                .scrollbar-custom::-webkit-scrollbar {
                  width: 8px;
                }
                .scrollbar-custom::-webkit-scrollbar-track {
                  background: #f1f5f9;
                  border-radius: 10px;
                }
                .scrollbar-custom::-webkit-scrollbar-thumb {
                  background: #cbd5e1;
                  border-radius: 10px;
                }
                .scrollbar-custom::-webkit-scrollbar-thumb:hover {
                  background: #94a3b8;
                }
              `}</style>
              <table className="w-full">
                <thead className="sticky top-0 bg-white z-10">
                  <tr className="border-b-2 border-slate-100">
                    <th className="px-8 py-5 text-left font-semibold text-slate-600">Mã đơn xuất</th>
                    <th className="px-8 py-5 text-left font-semibold text-slate-600">Ngày cập nhật</th>
                    <th className="px-8 py-5 text-left font-semibold text-slate-600">Trạng thái</th>
                    <th className="px-8 py-5 text-right font-semibold text-slate-600">Thành tiền</th>
                    {/* <th className="px-8 py-5 text-center font-semibold text-slate-600">Hành động</th> */}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {searchedOrders.map((order) => (
                    <tr
                      key={order._id}
                      className="hover:bg-slate-50 cursor-pointer"
                      onClick={() => {
                        router.push(`/home/order/${order._id}`);
                      }}
                    >
                      <td className="px-8 py-5">
                        <a
                          href="#"
                          className="text-blue-600 hover:text-blue-700 font-semibold"
                        >
                          {order.order_code}
                        </a>
                      </td>
                      <td className="px-8 py-5 text-slate-600">
                        {new Date(order.created_at).toLocaleString('vi-VN')}
                      </td>
                      <td className="px-8 py-5">
                        {order.payment_status ? (
                          <span className="inline-flex px-4 py-1.5 rounded-full text-sm bg-emerald-50 text-emerald-700 font-semibold border border-emerald-100/50">
                            Đã hoàn thành
                          </span>
                        ) : (
                          <span className="inline-flex px-4 py-1.5 rounded-full text-sm bg-yellow-50 text-yellow-600 font-semibold border border-yellow-100/50">
                            Chờ thanh toán
                          </span>
                        )}
                      </td>
                      <td className="px-8 py-5 text-right font-semibold text-slate-800">
                        {formatCurrency(order.total_amount)}
                      </td>
                      <td className="px-8 py-5 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {!order.payment_status && (
                            <Button
                              onClick={(event?: React.MouseEvent<HTMLButtonElement>) => {
                                event?.stopPropagation();
                                openPaymentModal(order._id, order.total_amount);
                              }}
                              className="px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
                            >
                              Hoàn thành thanh toán
                            </Button>
                          )}
                          {/* <Button
                            onClick={(event?: React.MouseEvent<HTMLButtonElement>) => {
                              event?.stopPropagation();
                              handleDeleteOrder(order._id);
                            }}
                            className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full transition-colors duration-200"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              className="h-5 w-5"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                              />
                            </svg>
                          </Button> */}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="px-8 py-5 border-t-2 border-slate-100 bg-slate-50">
              <div className="text-sm text-slate-600">
                Tổng đơn hàng: {searchedOrders.length}
              </div>
            </div>
          </div>
        )}

        <div className="mt-8 text-center">
          <p className="text-sm text-slate-500">
            Tìm hiểu thêm về {' '}
            <a href="#" className="text-blue-600 hover:text-blue-700 hover:underline font-semibold">
              quản lý đơn hàng nhập
            </a>
          </p>
        </div>

        {/* Payment Modal */}
        <PaymentModal
          isOpen={isModalOpen}
          onClose={closePaymentModal}
          onComplete={handlePaymentComplete}
          orderId={selectedOrderId}
          totalAmount={selectedOrderAmount}
          orderItems={selectedOrderItems}
        />

        {/* Bill Modal */}
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
      </div>
    </div>
  );
};

export default ImportOrderList;
