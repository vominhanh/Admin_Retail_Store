/* eslint-disable prefer-const */
/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { ReactElement, useState, useEffect, useCallback, useRef } from "react";
import { ECollectionNames } from "@/enums";
import { getCollectionCount } from "@/services/api-service";
import Script from 'next/script';
import Image from 'next/image';
import { IProductDetail } from "@/interfaces/product-detail.interface";

// Kiểu cho Google Charts
declare global {
  interface Window {
    google: {

      charts: any

      visualization: any
    };
  }
}

interface IRevenueData {
  date: string;
  value: number;
}

// interface ICustomerData {
//   date: string;
//   value: number;
// }

interface IProductInventoryData {
  date: string;
  value: number;
}

interface IDateRangeType {
  startDate: string;
  endDate: string;
}

interface IStatCardData {
  title: string;
  value: number;
  icon: string;
  iconColor: string;
  iconBgColor: string;
}

// Hàm phân tích chuỗi ngày DD/MM/YYYY thành đối tượng Date (luôn set giờ về đầu ngày)
function parseDate(dateString: string): Date {
  const [day, month, year] = dateString.split('/').map(part => parseInt(part, 10));
  return new Date(year, month - 1, day, 0, 0, 0, 0);
}

export default function Home(): ReactElement {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [totalRevenue, setTotalRevenue] = useState<number>(0);
  const [totalProducts, setTotalProducts] = useState<number>(0);
  const [totalProductDetails, setTotalProductDetails] = useState<number>(0);
  const [totalEmployees, setTotalEmployees] = useState<number>(0);
  const [totalOrders, setTotalOrders] = useState<number>(0);
  const [totalInventory, setTotalInventory] = useState<number>(0);
  const [revenueGrowth, setRevenueGrowth] = useState<number>(0);
  const [inventoryGrowth, setInventoryGrowth] = useState<number>(0);
  const [revenueData, setRevenueData] = useState<IRevenueData[]>([]);
  const [productInventoryData, setProductInventoryData] = useState<IProductInventoryData[]>([]);
  const [dateRange, setDateRange] = useState<IDateRangeType>({
    startDate: '',
    endDate: ''
  });
  const [prevDateRange, setPrevDateRange] = useState<IDateRangeType>({
    startDate: '',
    endDate: ''
  });

  const [statsCards, setStatsCards] = useState<IStatCardData[]>([]);
  const isInitialized = useRef(false);
  const [productDetails, setProductDetails] = useState<IProductDetail[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);

  // Hàm lấy số lượng từ collection
  const fetchCollectionCount = async (
    collectionName: ECollectionNames
  ): Promise<number> => {
    try {
      const response = await getCollectionCount(collectionName);
      const count = await response.json();
      console.log(`Số lượng ${collectionName}:`, count);
      return count;
    } catch (error) {
      console.error(`Lỗi khi lấy số lượng ${collectionName}:`, error);
      return 0;
    }
  };

  // Hàm lấy tổng doanh thu từ đơn hàng
  const fetchTotalRevenue = async (startDateStr?: string, endDateStr?: string): Promise<{ total: number, byDate: { [key: string]: number } }> => {
    try {
      const response = await fetch('/api/order');
      if (response.ok) {
        const orders = await response.json();

        // Nếu không truyền khoảng thời gian, mặc định lấy tháng hiện tại
        let startDate: Date | null = null;
        let endDate: Date | null = null;
        if (!startDateStr || !endDateStr) {
          const now = new Date();
          startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
        } else {
          startDate = parseDate(startDateStr);
          endDate = parseDate(endDateStr);
          endDate.setHours(23, 59, 59, 999); // Bao gồm cả ngày cuối cùng
        }

        // Tính doanh thu theo ngày
        const revenueByDate: { [key: string]: number } = {};
        let total = 0;

        orders.forEach((order: any) => {
          if (order.created_at && order.total_amount && order.total_amount > 0) {
            // Luôn chuyển created_at về local time để so sánh
            const orderDate = new Date(order.created_at);
            // So sánh ngày >= startDate và <= endDate
            if (startDate && endDate) {
              if (orderDate < startDate || orderDate > endDate) {
                return;
              }
            }
            const dateKey = `${orderDate.getDate()}/${orderDate.getMonth() + 1}`;
            if (!revenueByDate[dateKey]) {
              revenueByDate[dateKey] = 0;
            }
            revenueByDate[dateKey] += order.total_amount;
            total += order.total_amount;
          }
        });

        // Sau khi tính xong, set lại dữ liệu cho biểu đồ doanh thu
        setRevenueData(Object.keys(revenueByDate).map(date => ({ date, value: revenueByDate[date] })));

        return { total, byDate: revenueByDate };
      } else {
        throw new Error('Lỗi khi lấy dữ liệu đơn hàng');
      }
    } catch (error) {
      console.error('Lỗi khi tính tổng doanh thu:', error);
      return { total: 0, byDate: {} };
    }
  };

  // Hàm lấy dữ liệu tổng kho từ chi tiết sản phẩm
  const fetchTotalProductDetailStock = async (startDateStr?: string, endDateStr?: string): Promise<{ total: number, byDate: { [key: string]: number }, onSaleQuantity: number, stockQuantity: number }> => {
    try {
      const response = await fetch('/api/product-detail');
      if (response.ok) {
        const productDetails = await response.json();

        // Tính tổng số lượng trong kho
        let totalStockQuantity = 0;
        let onSaleQuantity = 0;
        let stockQuantity = 0;

        // Tính tổng kho từ chi tiết sản phẩm (input_quantity)
        productDetails.forEach((detail: IProductDetail) => {
          const inputQuantity = detail.input_quantity || 0;
          const outputQuantity = detail.output_quantity || 0;
          const remainingQuantity = inputQuantity - outputQuantity;

          totalStockQuantity += inputQuantity;
          onSaleQuantity += outputQuantity; // Số lượng đang bán trên quầy
          stockQuantity += remainingQuantity; // Số lượng tồn kho
        });

        // Tạo dữ liệu mẫu theo ngày
        const byDate: { [key: string]: number } = {};

        if (startDateStr && endDateStr) {
          const startDate = parseDate(startDateStr);
          const endDate = parseDate(endDateStr);
          const dateArray = generateDatesBetween(startDate, endDate, 7);

          // Phân bổ tổng kho đều cho các ngày
          dateArray.forEach((date) => {
            const dateKey = `${date.getDate()}/${date.getMonth() + 1}`;
            byDate[dateKey] = totalStockQuantity;
          });
        } else {
          // Nếu không có khoảng thời gian, sử dụng ngày hiện tại
          const today = new Date();
          const dateKey = `${today.getDate()}/${today.getMonth() + 1}`;
          byDate[dateKey] = totalStockQuantity;
        }

        console.log('Tổng kho từ chi tiết sản phẩm:', totalStockQuantity);
        console.log('Số lượng đang bán:', onSaleQuantity);
        console.log('Số lượng tồn kho:', stockQuantity);
        console.log('Tổng kho theo ngày:', byDate);

        setProductDetails(productDetails);

        return {
          total: totalStockQuantity,
          byDate: byDate,
          onSaleQuantity: onSaleQuantity,
          stockQuantity: stockQuantity
        };
      } else {
        throw new Error('Lỗi khi lấy dữ liệu chi tiết sản phẩm');
      }
    } catch (error) {
      console.error('Lỗi khi tính tổng kho từ chi tiết sản phẩm:', error);
      return {
        total: 0,
        byDate: {},
        onSaleQuantity: 0,
        stockQuantity: 0
      };
    }
  };

  // Hàm tổng hợp để lấy tất cả dữ liệu (khôi phục Promise.all lấy tất cả dữ liệu cùng lúc)
  const fetchAllData = useCallback(async (startDate?: string, endDate?: string): Promise<void> => {
    setIsLoading(true);
    try {
      const currentStartDate = startDate || dateRange.startDate;
      const currentEndDate = endDate || dateRange.endDate;

      const [
        productCount,
        productDetailCount,
        employeeCount,
        orderCount,
        revenueData,
        inventoryData
      ] = await Promise.all([
        fetchCollectionCount(ECollectionNames.PRODUCT),
        fetchCollectionCount(ECollectionNames.PRODUCT_DETAIL),
        fetchCollectionCount(ECollectionNames.USER),
        fetchCollectionCount(ECollectionNames.ORDER_FORM),
        fetchTotalRevenue(currentStartDate, currentEndDate),
        fetchTotalProductDetailStock(currentStartDate, currentEndDate)
      ]);

      setTotalProducts(productCount);
      setTotalProductDetails(productDetailCount);
      setTotalEmployees(employeeCount);
      setTotalOrders(orderCount);

      // Đặt tổng tồn kho từ dữ liệu thực tế (nếu có) hoặc tính toán từ sản phẩm + chi tiết sản phẩm
      const totalInventoryCount = inventoryData.total > 0 ?
        inventoryData.total :
        productCount + productDetailCount;
      setTotalInventory(totalInventoryCount);

      if (startDate && endDate) {
        setDateRange({
          startDate,
          endDate
        });
      }

      // Sử dụng doanh thu thực tế từ đơn hàng, nếu có; nếu không, tính toán ước tính
      const calculatedRevenue = revenueData.total > 0 ? revenueData.total : Math.max(orderCount * 750000, 1500000);
      setTotalRevenue(calculatedRevenue);
      setRevenueGrowth(18.3);
      setInventoryGrowth(7.8);

      const startDateObj = parseDate(currentStartDate);
      const endDateObj = parseDate(currentEndDate);
      // Tạo đủ tất cả các ngày trong khoảng
      const dateArray: Date[] = [];
      let d = new Date(startDateObj);
      while (d <= endDateObj) {
        dateArray.push(new Date(d));
        d.setDate(d.getDate() + 1);
      }

      // Biểu đồ doanh thu theo ngày (giữ nguyên)
      const newRevenueData: IRevenueData[] = [];
      dateArray.forEach((date) => {
        const dateKey = `${date.getDate()}/${date.getMonth() + 1}`;
        const value = revenueData.byDate[dateKey] || 0;
        newRevenueData.push({
          date: dateKey,
          value: value
        });
      });
      setRevenueData(newRevenueData);

      // Biểu đồ số lượng xuất theo ngày
      const newOutputData: IProductInventoryData[] = [];
      // Lấy productDetails từ API (nếu chưa có thì fetch)
      let productDetailsData = [];
      try {
        productDetailsData = await fetch('/api/product-detail').then(res => res.json());
      } catch { }
      dateArray.forEach((date) => {
        const dateKey = `${date.getDate()}/${date.getMonth() + 1}`;
        // Tổng output_quantity của các productDetails có ngày xuất ứng với ngày đó
        const totalOutput = productDetailsData.reduce((sum: number, detail: any) => {
          if (!detail.output_date) return sum;
          const outputDate = new Date(detail.output_date);
          if (
            outputDate.getDate() === date.getDate() &&
            outputDate.getMonth() === date.getMonth() &&
            outputDate.getFullYear() === date.getFullYear()
          ) {
            return sum + (Number(detail.output_quantity) || 0);
          }
          return sum;
        }, 0);
        newOutputData.push({
          date: dateKey,
          value: totalOutput
        });
      });
      setProductInventoryData(newOutputData);

      // Đếm sản phẩm sắp hết hạn (HSD < 30 ngày tới và tồn kho > 0)
      const soonExpiredProductCount = productDetails.filter(detail => {
        if (!detail.expiry_date) return false;
        const expiry = new Date(detail.expiry_date);
        const now = new Date();
        const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const input = Number(detail.input_quantity) || 0;
        const output = Number(detail.output_quantity) || 0;
        const stock = input - output;
        return diffDays > 0 && diffDays <= 30 && stock > 0;
      }).length;

      // Tổng số lượng xuất (output_quantity)
      const totalOutputQuantity = productDetails.reduce((sum, detail) => sum + (Number(detail.output_quantity) || 0), 0);

      // Sản phẩm trong kho (có tồn kho > 0)
      const productInStockCount = productDetails.filter(detail => {
        const input = Number(detail.input_quantity) || 0;
        const output = Number(detail.output_quantity) || 0;
        return (input - output) > 0;
      }).length;

      // Log dữ liệu thực tế để debug
      console.log('productDetails:', productDetails);
      console.log('soonExpiredProductCount:', soonExpiredProductCount);
      console.log('totalOutputQuantity:', totalOutputQuantity);
      console.log('productInStockCount:', productInStockCount);

      setStatsCards([
        {
          title: 'Sản phẩm sắp hết hạn',
          value: soonExpiredProductCount,
          icon: 'product',
          iconColor: 'text-pink-600',
          iconBgColor: 'bg-pink-100'
        },
        {
          title: 'Số lượng xuất',
          value: totalOutputQuantity,
          icon: 'employee',
          iconColor: 'text-indigo-600',
          iconBgColor: 'bg-indigo-100'
        },
        {
          title: 'Đơn hàng',
          value: orderCount,
          icon: 'order',
          iconColor: 'text-blue-600',
          iconBgColor: 'bg-blue-100'
        },
        {
          title: 'Sản phẩm trong kho',
          value: productInStockCount,
          icon: 'product-detail',
          iconColor: 'text-amber-600',
          iconBgColor: 'bg-amber-100'
        }
      ]);
    } catch (error) {
      console.error('Lỗi khi lấy dữ liệu:', error);

      // Dữ liệu mẫu nếu API bị lỗi
      setTotalProducts(120);
      setTotalEmployees(15);
      setTotalProductDetails(250);
      setTotalOrders(45);
      setTotalInventory(370); // Tổng products + product details

      // Ước tính doanh thu mẫu
      const estimatedRevenue = 45 * 750000;

      try {
        // Vẫn thử lấy dữ liệu thực tế nếu có thể
        const [actualRevenue, actualInventory] = await Promise.all([
          fetchTotalRevenue(dateRange.startDate, dateRange.endDate),
          fetchTotalProductDetailStock(dateRange.startDate, dateRange.endDate)
        ]);

        // Nếu có doanh thu thực tế, sử dụng
        if (actualRevenue.total > 0) {
          setTotalRevenue(actualRevenue.total);
        } else {
          // Nếu không, sử dụng dữ liệu ước tính
          setTotalRevenue(estimatedRevenue);
        }

        // Nếu có dữ liệu tồn kho thực tế, sử dụng
        if (actualInventory.total > 0) {
          setTotalInventory(actualInventory.total);
        }
      } catch {
        // Nếu không lấy được doanh thu, sử dụng dữ liệu ước tính
        setTotalRevenue(estimatedRevenue);
      }

      setRevenueGrowth(18.3);
      setInventoryGrowth(7.8);

      const currentStartDate = startDate || dateRange.startDate;
      const currentEndDate = endDate || dateRange.endDate;
      const startDateObj = parseDate(currentStartDate);
      const endDateObj = parseDate(currentEndDate);
      const sampleDates = generateDatesBetween(startDateObj, endDateObj, 7);

      // Dữ liệu giả cho biểu đồ doanh thu và tồn kho
      const dailyCoefficients = generateRandomCoefficients(sampleDates.length);

      const newRevenueData: IRevenueData[] = [];
      const newInventoryData: IProductInventoryData[] = [];

      sampleDates.forEach((date, index) => {
        const formattedDate = `${date.getDate()}/${date.getMonth() + 1}`;

        // Doanh thu
        newRevenueData.push({
          date: formattedDate,
          value: Math.round(estimatedRevenue * dailyCoefficients[index])
        });

        // Tồn kho
        newInventoryData.push({
          date: formattedDate,
          value: Math.floor(Math.random() * 50) + 320
        });
      });

      setRevenueData(newRevenueData);
      setProductInventoryData(newInventoryData);

      // Đếm sản phẩm sắp hết hạn (HSD < 30 ngày tới và tồn kho > 0)
      const soonExpiredProductCount = productDetails.filter(detail => {
        if (!detail.expiry_date) return false;
        const expiry = new Date(detail.expiry_date);
        const now = new Date();
        const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
        const input = Number(detail.input_quantity) || 0;
        const output = Number(detail.output_quantity) || 0;
        const stock = input - output;
        return diffDays > 0 && diffDays <= 30 && stock > 0;
      }).length;

      // Tổng số lượng xuất (output_quantity)
      const totalOutputQuantity = productDetails.reduce((sum, detail) => sum + (Number(detail.output_quantity) || 0), 0);

      // Sản phẩm trong kho (có tồn kho > 0)
      const productInStockCount = productDetails.filter(detail => {
        const input = Number(detail.input_quantity) || 0;
        const output = Number(detail.output_quantity) || 0;
        return (input - output) > 0;
      }).length;

      // Đơn hàng (orders)
      const orderCount = Array.isArray(orders) ? orders.length : 0;

      setStatsCards([
        {
          title: 'Sản phẩm sắp hết hạn',
          value: soonExpiredProductCount,
          icon: 'product',
          iconColor: 'text-pink-600',
          iconBgColor: 'bg-pink-100'
        },
        {
          title: 'Số lượng xuất',
          value: totalOutputQuantity,
          icon: 'employee',
          iconColor: 'text-indigo-600',
          iconBgColor: 'bg-indigo-100'
        },
        {
          title: 'Đơn hàng',
          value: orderCount,
          icon: 'order',
          iconColor: 'text-blue-600',
          iconBgColor: 'bg-blue-100'
        },
        {
          title: 'Sản phẩm trong kho',
          value: productInStockCount,
          icon: 'product-detail',
          iconColor: 'text-amber-600',
          iconBgColor: 'bg-amber-100'
        }
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [dateRange]);

  // Hàm tạo các điểm ngày đều đặn giữa hai ngày, với số lượng điểm cố định
  const generateDatesBetween = (startDate: Date, endDate: Date, pointCount: number): Date[] => {
    const result: Date[] = [];

    if (startDate.getTime() === endDate.getTime()) {
      for (let i = 0; i < pointCount; i++) {
        const date = new Date(startDate);
        date.setDate(date.getDate() - (pointCount - i - 1));
        result.push(date);
      }
      return result;
    }

    const timeRange = endDate.getTime() - startDate.getTime();
    const interval = timeRange / (pointCount - 1);

    for (let i = 0; i < pointCount; i++) {
      const time = startDate.getTime() + i * interval;
      result.push(new Date(time));
    }

    return result;
  };

  // Hàm tạo các hệ số ngẫu nhiên có tổng bằng 1
  const generateRandomCoefficients = (count: number): number[] => {
    const randomNumbers: number[] = [];
    let sum = 0;

    for (let i = 0; i < count; i++) {
      const randomVal = 0.5 + Math.random();
      randomNumbers.push(randomVal);
      sum += randomVal;
    }

    // Chuẩn hóa để tổng bằng 1
    return randomNumbers.map(val => val / sum);
  };

  // Hàm để định dạng ngày thành chuỗi DD/MM/YYYY
  const formatDate = (date: Date): string => {
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };

  // Hàm tạo các khoảng thời gian cho dropdown
  const generateDateRangeOptions = (): { label: string, value: string, startDate: string, endDate: string }[] => {
    const today = new Date();

    // Hôm nay
    const todayStr = formatDate(today);

    // 7 ngày qua
    const last7Days = new Date(today);
    last7Days.setDate(today.getDate() - 6);
    const last7DaysStr = formatDate(last7Days);

    // 30 ngày qua
    const last30Days = new Date(today);
    last30Days.setDate(today.getDate() - 29);
    const last30DaysStr = formatDate(last30Days);

    // Tháng này
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const firstDayOfMonthStr = formatDate(firstDayOfMonth);

    // Tháng trước
    const firstDayOfLastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    const lastDayOfLastMonth = new Date(today.getFullYear(), today.getMonth(), 0);
    const firstDayOfLastMonthStr = formatDate(firstDayOfLastMonth);
    const lastDayOfLastMonthStr = formatDate(lastDayOfLastMonth);

    return [
      {
        label: 'Hôm nay',
        value: `${todayStr} - ${todayStr}`,
        startDate: todayStr,
        endDate: todayStr
      },
      {
        label: '7 ngày qua',
        value: `${last7DaysStr} - ${todayStr}`,
        startDate: last7DaysStr,
        endDate: todayStr
      },
      {
        label: '30 ngày qua',
        value: `${last30DaysStr} - ${todayStr}`,
        startDate: last30DaysStr,
        endDate: todayStr
      },
      {
        label: 'Tháng này',
        value: `${firstDayOfMonthStr} - ${todayStr}`,
        startDate: firstDayOfMonthStr,
        endDate: todayStr
      },
      {
        label: 'Tháng trước',
        value: `${firstDayOfLastMonthStr} - ${lastDayOfLastMonthStr}`,
        startDate: firstDayOfLastMonthStr,
        endDate: lastDayOfLastMonthStr
      }
    ];
  };

  // Hàm thay đổi khoảng thời gian
  const handleDateRangeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedValue = e.target.value;
    const dateOptions = generateDateRangeOptions();
    const selectedOption = dateOptions.find(option => option.value === selectedValue);

    if (selectedOption) {
      // Lưu khoảng thời gian hiện tại vào khoảng trước đó
      setPrevDateRange({
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      });

      // Gọi API để lấy dữ liệu mới với khoảng thời gian đã chọn
      fetchAllData(selectedOption.startDate, selectedOption.endDate);
    }

  }, [fetchAllData, dateRange]);

  // Khởi tạo ứng dụng
  useEffect(() => {
    if (!isInitialized.current) {
      const dateOptions = generateDateRangeOptions();
      const defaultOption = dateOptions[1]; // Mặc định chọn "7 ngày qua"

      // Cài đặt khoảng thời gian ban đầu
      setDateRange({
        startDate: defaultOption.startDate,
        endDate: defaultOption.endDate
      });

      setPrevDateRange({
        startDate: dateOptions[4].startDate, // Tháng trước
        endDate: dateOptions[4].endDate
      });

      // Đánh dấu đã khởi tạo
      isInitialized.current = true;

      // Gọi lấy dữ liệu ban đầu
      fetchAllData(defaultOption.startDate, defaultOption.endDate);
    }

  }, []);

  // Tự động cập nhật dữ liệu
  useEffect(() => {
    // Cập nhật dữ liệu định kỳ mỗi phút
    const intervalId = setInterval(() => {
      console.log('Đang tự động cập nhật dữ liệu...');
      fetchAllData(dateRange.startDate, dateRange.endDate);
    }, 60 * 1000); // Cập nhật mỗi 1 phút để dễ kiểm tra

    return () => {
      clearInterval(intervalId);
    };
  }, [fetchAllData, dateRange]);

  // Khởi tạo Google Charts
  useEffect(() => {
    // Hàm này sẽ được gọi khi Google Charts API được load xong
    const initGoogleCharts = () => {
      if (typeof window !== 'undefined' && window.google && window.google.charts) {
        window.google.charts.load('current', { 'packages': ['corechart'] });
        window.google.charts.setOnLoadCallback(drawCharts);
      }
    };

    // Vẽ các biểu đồ
    const drawCharts = () => {
      // Biểu đồ phân bổ doanh thu theo danh mục (Top 5 sản phẩm bán chạy nhất)
      if (document.getElementById('revenue-pie-chart')) {
        // Tính tổng số lượng bán ra cho từng sản phẩm
        const productSales: { [productName: string]: number } = {};
        productDetails.forEach(detail => {
          // Tìm tên sản phẩm từ danh sách products
          const product = products.find(p => p._id === detail.product_id);
          const name = product?.name || 'Không tên';
          const sold = detail.output_quantity || 0;
          productSales[name] = (productSales[name] || 0) + sold;
        });
        // Sắp xếp theo số lượng bán ra giảm dần
        const sorted = Object.entries(productSales).sort((a, b) => b[1] - a[1]);
        // Lấy 5 sản phẩm bán chạy nhất
        const top5 = sorted.slice(0, 5);
        // Gộp các sản phẩm còn lại vào 'Khác'
        const otherTotal = sorted.slice(5).reduce((sum, [, qty]) => sum + qty, 0);
        // Chuẩn bị dữ liệu cho Pie Chart
        const pieData: (string | number)[][] = [
          ['Sản phẩm', 'Số lượng bán']
        ];
        top5.forEach(([name, qty]) => pieData.push([String(name), Number(qty)]));
        if (otherTotal > 0) pieData.push(['Khác', Number(otherTotal)]);
        if (pieData.length === 1) pieData.push(['Không có dữ liệu', 1]);
        const data = window.google.visualization.arrayToDataTable(pieData);
        const options = {
          title: '',
          colors: ['#60a5fa', '#34d399', '#f97316', '#a855f7', '#f43f5e', '#a3a3a3'],
          chartArea: { width: '90%', height: '80%' },
          legend: {
            position: 'bottom',
            alignment: 'center',
            maxLines: 3,
            textStyle: {
              fontSize: 18,
              fontName: 'Montserrat, Arial, sans-serif',
              color: '#374151',
              bold: true,
            }
          },
          pieHole: 0.5,
          backgroundColor: 'transparent',
          pieSliceText: 'percentage',
          pieSliceTextStyle: {
            fontSize: 28,
            color: '#fff',
            bold: true,
            fontName: 'Montserrat, Arial, sans-serif'
          },
          tooltip: {
            showColorCode: true,
            text: 'both',
            textStyle: {
              fontSize: 18,
              fontName: 'Montserrat, Arial, sans-serif'
            }
          },
          slices: {
            0: { offset: 0.10 },
            1: { offset: 0.06 },
            2: { offset: 0.04 },
            3: { offset: 0.02 },
            4: { offset: 0.01 },
          },
          fontName: 'Montserrat, Arial, sans-serif',
          borderRadius: 32,
          enableInteractivity: true,
          pieStartAngle: 30,
        };
        const chartDiv = document.getElementById('revenue-pie-chart');
        if (chartDiv) {
          chartDiv.style.boxShadow = '0 12px 40px 0 rgba(96,165,250,0.18)';
          chartDiv.style.borderRadius = '32px';
          chartDiv.style.background = 'linear-gradient(135deg, #f0f7ff 0%, #e0e7ff 100%)';
          chartDiv.style.padding = '32px 0';
          chartDiv.style.display = 'flex';
          chartDiv.style.alignItems = 'center';
          chartDiv.style.justifyContent = 'center';
        }
        const chart = new window.google.visualization.PieChart(chartDiv);
        chart.draw(data, options);
      }

      // Biểu đồ tròn tình trạng hàng hóa
      if (document.getElementById('stock-status-pie-chart')) {
        const data = window.google.visualization.arrayToDataTable([
          ['Tình trạng', 'Số lượng'],
          ['Còn hàng', inStock],
          ['Sắp hết hạng', lowStock],
          ['Hết hàng', outOfStock]
        ]);
        const options = {
          title: '',
          colors: ['#22c55e', '#facc15', '#ef4444'],
          chartArea: { width: '100%', height: '80%' },
          legend: { position: 'bottom' },
          pieHole: 0.4,
        };
        const chart = new window.google.visualization.PieChart(document.getElementById('stock-status-pie-chart'));
        chart.draw(data, options);
      }

      // Biểu đồ tổng kho theo ngày
      if (window.google && window.google.visualization && document.getElementById('inventory-status-chart')) {
        const startDateObj = parseDate(dateRange.startDate);
        const endDateObj = parseDate(dateRange.endDate);
        // Luôn tạo đủ ngày
        const dateArray: Date[] = [];
        let d = new Date(startDateObj);
        while (d <= endDateObj) {
          dateArray.push(new Date(d));
          d.setDate(d.getDate() + 1);
        }
        const stockStatusByDate = dateArray.map((date: Date) => {
          // Đếm số sản phẩm sắp hết hạn trong vòng 7 ngày kể từ ngày này
          const soonExpired = productDetails.filter((detail: IProductDetail) => {
            if (!detail.expiry_date) return false;
            const expiry = new Date(detail.expiry_date);
            return expiry >= date && expiry <= new Date(date.getTime() + 6 * 24 * 60 * 60 * 1000);
          }).length;
          return {
            date: `${date.getDate()}/${date.getMonth() + 1}`,
            soonExpired
          };
        });
        const chartData = [
          ['Ngày', 'Sắp hết hạn'],
          ...stockStatusByDate.map((item: any) => [item.date, item.soonExpired])
        ];
        const data = window.google.visualization.arrayToDataTable(chartData);
        const options = {
          title: 'Số lượng sản phẩm sắp hết hạn theo ngày',
          legend: { position: 'bottom' },
          colors: ['#facc15'],
          height: 300,
          vAxis: { title: 'Số lượng sắp hết hạn' },
          hAxis: { title: 'Ngày' }
        };
        const chart = new window.google.visualization.ColumnChart(document.getElementById('inventory-status-chart'));
        chart.draw(data, options);
      }
    };

    // Gọi hàm khởi tạo
    if (typeof window !== 'undefined' && !isLoading) {
      if (window.google && window.google.charts) {
        initGoogleCharts();
      } else {
        // Thêm sự kiện listener để khởi tạo biểu đồ khi script được load
        window.addEventListener('google-charts-loaded', initGoogleCharts);
      }
    }

    // Cleanup listener
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('google-charts-loaded', initGoogleCharts);
      }
    };
  }, [isLoading, totalRevenue, totalProducts, totalProductDetails, totalOrders, totalInventory, productInventoryData, productDetails, products, orders]);

  // Hàm format số tiền
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('vi-VN').format(amount);
  };

  // Hàm vẽ biểu đồ doanh thu
  const renderRevenueChart = () => {
    const maxValue = Math.max(...revenueData.map(item => item.value));
    const chartHeight = 200;

    return (
      <div className="relative h-[200px] w-full mt-4">
        {/* Trục Y - giá trị */}
        <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-500">
          <div>{(maxValue / 1000000).toFixed(1)}M</div>
          <div>{(maxValue * 0.75 / 1000000).toFixed(1)}M</div>
          <div>{(maxValue * 0.5 / 1000000).toFixed(1)}M</div>
          <div>{(maxValue * 0.25 / 1000000).toFixed(1)}M</div>
          <div>0</div>
        </div>

        {/* Biểu đồ */}
        <div className="absolute left-8 right-0 top-0 h-full">
          <div className="relative h-full w-full">
            {/* Đường kẻ ngang */}
            <div className="absolute top-0 w-full border-t border-gray-200"></div>
            <div className="absolute top-1/4 w-full border-t border-gray-200"></div>
            <div className="absolute top-2/4 w-full border-t border-gray-200"></div>
            <div className="absolute top-3/4 w-full border-t border-gray-200"></div>
            <div className="absolute bottom-0 w-full border-t border-gray-200"></div>

            {/* Vẽ biểu đồ */}
            <div className="absolute inset-0 flex items-end">
              {revenueData.map((item, index) => {
                const heightPercent = (item.value / maxValue) * 100;
                const isFirst = index === 0;
                // const isLast = index === revenueData.length - 1;
                const width = 100 / (revenueData.length - 1);

                return (
                  <div
                    key={index}
                    className="relative h-full group"
                    style={{ width: `${width}%` }}
                  >
                    {/* Thanh biểu đồ */}
                    <div
                      className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-8 bg-blue-500 rounded-t-lg transition-all duration-300 hover:bg-blue-600"
                      style={{ height: `${heightPercent}%` }}
                    >
                      {/* Tooltip */}
                      <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap transition-opacity duration-200">
                        {formatCurrency(item.value)}đ
                      </div>
                    </div>

                    {/* Đường nối các điểm */}
                    {!isFirst && (
                      <div
                        className="absolute bottom-0 right-1/2 w-full h-px bg-blue-500"
                        style={{
                          transform: `rotate(${Math.atan2(
                            (revenueData[index].value - revenueData[index - 1].value) / maxValue * chartHeight,
                            width
                          )}rad)`,
                          transformOrigin: 'right bottom',
                          width: `${width}%`
                        }}
                      ></div>
                    )}

                    {/* Nhãn trục X */}
                    <div className="absolute bottom-[-20px] left-1/2 transform -translate-x-1/2 text-xs text-gray-500">
                      {item.date}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Hàm vẽ biểu đồ sản phẩm trong kho
  const renderInventoryChart = () => {
    const maxValue = Math.max(...productInventoryData.map(item => item.value));
    const chartHeight = 150;

    return (
      <div className="relative h-[150px] w-full mt-4">
        {/* Trục Y - giá trị */}
        <div className="absolute left-0 top-0 h-full flex flex-col justify-between text-xs text-gray-500">
          <div>{maxValue}</div>
          <div>{Math.round(maxValue * 0.66)}</div>
          <div>{Math.round(maxValue * 0.33)}</div>
          <div>0</div>
        </div>

        {/* Biểu đồ */}
        <div className="absolute left-8 right-0 top-0 h-full">
          <div className="relative h-full w-full">
            {/* Đường kẻ ngang */}
            <div className="absolute top-0 w-full border-t border-gray-200"></div>
            <div className="absolute top-1/3 w-full border-t border-gray-200"></div>
            <div className="absolute top-2/3 w-full border-t border-gray-200"></div>
            <div className="absolute bottom-0 w-full border-t border-gray-200"></div>

            {/* Vẽ biểu đồ */}
            <div className="absolute inset-0">
              {productInventoryData.map((item, index) => {
                const heightPercent = (item.value / maxValue) * 100;
                const isFirst = index === 0;
                const width = 100 / (productInventoryData.length - 1);

                return (
                  <div
                    key={index}
                    className="absolute bottom-0 group"
                    style={{
                      left: `${index * width}%`,
                      height: `${heightPercent}%`,
                      width: `${width}%`
                    }}
                  >
                    {/* Vùng màu dưới đường */}
                    {!isFirst && (
                      <div
                        className="absolute bottom-0 left-0 w-full bg-green-100 opacity-40"
                        style={{
                          height: `${heightPercent}%`
                        }}
                      ></div>
                    )}

                    {/* Điểm dữ liệu */}
                    <div
                      className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-green-500 rounded-full transition-all duration-300 hover:bg-green-600 hover:scale-110"
                      style={{ bottom: `${heightPercent}%` }}
                    >
                      {/* Tooltip */}
                      <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap transition-opacity duration-200">
                        {item.value} sản phẩm
                      </div>
                    </div>

                    {/* Đường nối các điểm */}
                    {!isFirst && (
                      <div
                        className="absolute bottom-0 right-1/2 w-full h-px bg-green-500"
                        style={{
                          transform: `rotate(${Math.atan2(
                            (productInventoryData[index].value - productInventoryData[index - 1].value) / maxValue * chartHeight,
                            width
                          )}rad)`,
                          transformOrigin: 'right bottom',
                          width: `${width}%`
                        }}
                      ></div>
                    )}

                    {/* Nhãn trục X */}
                    <div className="absolute bottom-[-20px] left-1/2 transform -translate-x-1/2 text-xs text-gray-500">
                      {item.date}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Hàm tính số lượng theo trạng thái tồn kho
  const countByStatus = (details: IProductDetail[]) => {
    let inStock = 0, lowStock = 0, outOfStock = 0;
    details.forEach(detail => {
      const input = detail.input_quantity || 0;
      const output = detail.output_quantity || 0;
      const remaining = input - output;
      if (remaining > 10) inStock++;
      else if (remaining > 0) lowStock++;
      else outOfStock++;
    });
    return { inStock, lowStock, outOfStock };
  };

  // Phần hiển thị loading
  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-screen bg-white">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-16 w-16 border-t-4 border-blue-600 border-solid border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
          <p className="mt-4 text-slate-700 font-medium">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  const { inStock, lowStock, outOfStock } = countByStatus(productDetails);

  return (
    <>
      <Script
        strategy="afterInteractive"
        src="https://www.gstatic.com/charts/loader.js"
        onLoad={() => {
          window.dispatchEvent(new Event('google-charts-loaded'));
        }}
      />

      <div className="p-6 bg-gray-50">
        {/* Tiêu đề và bộ lọc */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">Tổng quan báo cáo</h1>

          <div className="mt-3 md:mt-0 flex items-center">
            <div className="relative inline-block">
              <select
                className="appearance-none border border-gray-200 rounded-lg py-2.5 px-6 pr-12 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 cursor-pointer shadow-sm hover:shadow-md transition-all duration-200 min-w-[200px]"
                onChange={handleDateRangeChange}
                defaultValue={`${dateRange.startDate} - ${dateRange.endDate}`}
              >
                {generateDateRangeOptions().map((option, index) => (
                  <option key={index} value={option.value} className="py-2 text-gray-700">
                    {option.label}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-blue-600">
                <Image
                  src="/icons/chevron-down.svg"
                  alt="Chọn khoảng thời gian"
                  width={20}
                  height={20}
                  priority
                  style={{ filter: 'brightness(0) saturate(100%) invert(37%) sepia(98%) saturate(1234%) hue-rotate(206deg) brightness(97%) contrast(101%)' }}
                />
              </div>
            </div>


          </div>
        </div>

        {/* Các thẻ thống kê bổ sung */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {statsCards.map((card, index) => (
            <div key={index} className="bg-white rounded-xl border border-gray-100 p-6 flex items-center shadow-sm hover:shadow-lg transition-all duration-300 transform hover:-translate-y-1">
              <div className={`p-3 rounded-xl mr-4 ${card.iconBgColor}`}>
                <Image
                  src={`/icons/${card.icon}.svg`}
                  alt={card.title}
                  width={28}
                  height={28}
                  priority
                  style={{
                    filter: card.iconColor === 'text-pink-600' ? 'brightness(0) saturate(100%) invert(32%) sepia(98%) saturate(1234%) hue-rotate(330deg) brightness(97%) contrast(101%)' :
                      card.iconColor === 'text-indigo-600' ? 'brightness(0) saturate(100%) invert(37%) sepia(98%) saturate(1234%) hue-rotate(206deg) brightness(97%) contrast(101%)' :
                        card.iconColor === 'text-blue-600' ? 'brightness(0) saturate(100%) invert(37%) sepia(98%) saturate(1234%) hue-rotate(206deg) brightness(97%) contrast(101%)' :
                          'brightness(0) saturate(100%) invert(37%) sepia(98%) saturate(1234%) hue-rotate(206deg) brightness(97%) contrast(101%)'
                  }}
                />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-600">{card.title}</p>
                <p className="text-xl font-bold text-gray-800 mt-1">
                  {card.title.includes('Doanh thu') ? formatCurrency(card.value) + 'đ' : formatCurrency(card.value)}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Khung thống kê chính */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-6">
          {/* Khung doanh thu */}
          <div className="border border-gray-100 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 bg-white overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-blue-50 to-blue-100">
              <h2 className="font-semibold text-gray-700 uppercase text-sm">DOANH THU TRONG KHOẢNG THỜI GIAN</h2>
              <div className="flex items-center mt-3">
                <span className="text-blue-700 text-2xl font-bold">{formatCurrency(totalRevenue)}Đ</span>
                <span className="ml-4 text-green-600 flex items-center bg-green-50 px-3 py-1.5 rounded-full text-sm font-medium">
                  <Image
                    src="/icons/arrow-up.svg"
                    alt="Tăng trưởng"
                    width={16}
                    height={16}
                    className="mr-1"
                    priority
                  />
                  {revenueGrowth.toFixed(1)}%
                </span>
              </div>
              <div className="text-sm text-gray-600 mt-2">{dateRange.startDate} - {dateRange.endDate}</div>
            </div>

            <div className="p-6">
              <h3 className="text-sm font-medium text-gray-700 mb-4">Doanh thu theo thời gian</h3>
              <div className="bg-blue-50 p-5 rounded-lg">
                {renderRevenueChart()}
              </div>

              <div className="flex justify-center mt-6 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                <div className="flex items-center mr-6">
                  <span className="block w-4 h-1 bg-blue-600 mr-2 rounded-full"></span>
                  <span className="font-medium">{dateRange.startDate} - {dateRange.endDate}</span>
                </div>
                <div className="flex items-center">
                  <span className="block w-4 h-1 border-b border-blue-600 border-dashed mr-2"></span>
                  <span>{prevDateRange.startDate} - {prevDateRange.endDate}</span>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 bg-gradient-to-r from-white to-blue-50">
              <div className="w-full flex flex-col items-center justify-center py-8" style={{ minHeight: 340, borderRadius: 32, background: 'linear-gradient(135deg, #e0e7ff 0%, #f0f7ff 100%)', boxShadow: '0 12px 40px 0 rgba(96,165,250,0.10)' }}>
                <h3 className="text-2xl md:text-3xl font-bold mb-6 text-center tracking-wide drop-shadow-lg" style={{ color: '#2563eb', letterSpacing: 1 }}>
                  Top 5 sản phẩm bán chạy nhất
                </h3>
                <div id="revenue-pie-chart" style={{ width: '100%', height: 340, maxWidth: 900, margin: '0 auto' }}></div>
              </div>
            </div>
          </div>

          {/* Khung sản phẩm trong kho */}
          <div className="border border-gray-100 rounded-xl shadow-md hover:shadow-lg transition-all duration-300 bg-white overflow-hidden">
            <div className="p-6 border-b border-gray-100 bg-gradient-to-r from-green-50 to-green-100">
              <h2 className="font-semibold text-gray-700 uppercase text-sm">TỔNG KHO THEO THỜI GIAN</h2>
              <div className="flex items-center mt-3">
                <span className="text-green-700 text-2xl font-bold">{totalInventory}</span>
                <span className="ml-4 text-green-600 flex items-center bg-green-50 px-3 py-1.5 rounded-full text-sm font-medium">
                  <Image
                    src="/icons/arrow-up.svg"
                    alt="Tăng trưởng"
                    width={16}
                    height={16}
                    className="mr-1"
                    priority
                  />
                  {inventoryGrowth.toFixed(1)}%
                </span>
              </div>
              <div className="text-sm text-gray-600 mt-2">{dateRange.startDate} - {dateRange.endDate}</div>
            </div>

            <div className="p-6">
              <h3 className="text-sm font-medium text-gray-700 mb-4">Số lượng tổng kho theo ngày</h3>

              <div className="bg-white rounded-lg p-4 mb-4 border border-gray-100 shadow-sm">
                <div className="flex flex-wrap text-sm">
                  <div className="flex items-center mr-6 mb-1">
                    <span className="inline-block w-3 h-3 bg-green-600 mr-2 rounded-full"></span>
                    <span className="font-medium text-gray-700">{dateRange.startDate} - {dateRange.endDate}</span>
                  </div>
                  <div className="flex items-center">
                    <span className="inline-block w-3 h-3 border border-green-600 mr-2"></span>
                    <span className="text-gray-600">{prevDateRange.startDate} - {prevDateRange.endDate}</span>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 p-5 rounded-lg">
                {renderInventoryChart()}
              </div>

              <div className="flex justify-center mt-6 text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                <div className="flex items-center mr-6">
                  <span className="block w-4 h-1 bg-green-600 mr-2 rounded-full"></span>
                  <span className="font-medium">{dateRange.startDate} - {dateRange.endDate}</span>
                </div>
                <div className="flex items-center">
                  <span className="block w-4 h-1 border-b border-green-600 border-dashed mr-2"></span>
                  <span>{prevDateRange.startDate} - {prevDateRange.endDate}</span>
                </div>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 bg-gradient-to-r from-white to-green-50">
              <div className="w-full flex flex-col items-center justify-center py-8" style={{ minHeight: 340, borderRadius: 32, background: 'linear-gradient(135deg, #e0ffe7 0%, #f0fff7 100%)', boxShadow: '0 12px 40px 0 rgba(34,197,94,0.10)' }}>
                <h3 className="text-2xl md:text-3xl font-bold mb-6 text-center tracking-wide drop-shadow-lg" style={{ color: '#16a34a', letterSpacing: 1 }}>
                  Tình trạng hàng hóa
                </h3>
                <div id="stock-status-pie-chart" style={{ width: '100%', height: 340, maxWidth: 900, margin: '0 auto' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
