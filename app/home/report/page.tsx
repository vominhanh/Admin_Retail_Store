/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';
import React, { useEffect, useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { FaCalendarAlt, FaChartLine, FaFileInvoiceDollar, FaShoppingCart, FaListAlt, FaDollarSign, FaFileExcel, FaSpinner } from 'react-icons/fa';
import ExcelJS from 'exceljs';

const TYPE_OPTIONS = [
    { value: 'day', label: 'Theo ngày' },
    { value: 'month', label: 'Theo tháng (trong năm)' },
    { value: 'year', label: 'Theo năm' },
    { value: 'product', label: 'Theo sản phẩm' },
    { value: 'category', label: 'Theo loại sản phẩm' },
];

function formatCurrency(n: number) {
    return n.toLocaleString('vi-VN') + ' ₫';
}

// Hàm lấy ngày hôm nay dạng yyyy-mm-dd
function getToday() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

// Hàm lấy tháng hiện tại dạng yyyy-mm
function getCurrentMonth() {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    return `${yyyy}-${mm}`;
}

export default function ReportPage() {
    const [type, setType] = useState('month');
    const [date, setDate] = useState(getToday());
    const [month, setMonth] = useState(getCurrentMonth());
    const [year, setYear] = useState(new Date().getFullYear().toString());
    const [productId, setProductId] = useState('');
    const [categoryId, setCategoryId] = useState('');
    const [products, setProducts] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [data, setData] = useState<any[]>([]);
    const [topProducts, setTopProducts] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [totalSummary, setTotalSummary] = useState({
        totalRevenue: 0,
        totalOrders: 0,
        periodLabel: ''
    });
    const [fromDate, setFromDate] = useState('');
    const [toDate, setToDate] = useState('');
    const [shouldFetch, setShouldFetch] = useState(false);

    // Lấy danh sách sản phẩm và danh mục
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [productsRes, categoriesRes] = await Promise.all([
                    fetch('/api/product?limit=1000'),
                    fetch('/api/category?limit=1000')
                ]);
                const [productsData, categoriesData] = await Promise.all([
                    productsRes.json(),
                    categoriesRes.json()
                ]);
                setProducts(productsData);
                setCategories(categoriesData);
            } catch (error) {
                console.error('Lỗi khi tải dữ liệu:', error);
                setProducts([]);
                setCategories([]);
            }
        };
        fetchData();
    }, []);

    // Xử lý thay đổi loại báo cáo
    const handleTypeChange = (newType: string) => {
        setType(newType);
        if (newType === 'day') {
            setDate(getToday());
        } else {
            setDate('');
        }
        if (newType === 'month') {
            setMonth(getCurrentMonth());
        } else {
            setMonth('');
        }
        setYear(new Date().getFullYear().toString());
        setProductId('');
        setCategoryId('');
        setTopProducts([]);
    };

    // Tải dữ liệu báo cáo
    useEffect(() => {
        if ((type === 'product' || type === 'category') && !shouldFetch) return;
        const fetchReportData = async () => {
            let url = '/api/report/revenue?type=' + type;
            let valid = true;
            let periodLabel = '';

            // Xây dựng URL và periodLabel dựa trên loại báo cáo
            if (type === 'day') {
                if (!date) valid = false;
                else {
                    url = `/api/report/revenue?type=hour&date=${date}`;
                    periodLabel = `Ngày ${date.split('-').reverse().join('/')}`;
                }
            } else if (type === 'month') {
                if (!month) valid = false;
                else {
                    url = `/api/report/revenue?type=day&month=${month}`;
                    const [y, m] = month.split('-');
                    periodLabel = `Tháng ${m}/${y}`;
                }
            } else if (type === 'year') {
                url += `&year=${year}`;
                periodLabel = `Năm ${year}`;
            } else if (type === 'product') {
                if (!productId) valid = false;
                else {
                    const product = products.find(p => p._id === productId);
                    periodLabel = product ? `SP: ${product.name}` : '';
                    url += `&productId=${productId}`;
                    if (fromDate) url += `&fromDate=${fromDate}`;
                    if (toDate) url += `&toDate=${toDate}`;
                    if (month) {
                        url += `&month=${month}`;
                        const [y, m] = month.split('-');
                        periodLabel += ` (Tháng ${m}/${y})`;
                    } else if (year) {
                        url += `&year=${year}`;
                        periodLabel += ` (Năm ${year})`;
                    }
                }
            } else if (type === 'category') {
                if (!categoryId) valid = false;
                else {
                    const category = categories.find(c => c._id === categoryId);
                    periodLabel = category ? `Loại: ${category.name}` : '';
                    url += `&categoryId=${categoryId}`;
                    if (fromDate) url += `&fromDate=${fromDate}`;
                    if (toDate) url += `&toDate=${toDate}`;
                    if (month) {
                        url += `&month=${month}`;
                        const [y, m] = month.split('-');
                        periodLabel += ` (Tháng ${m}/${y})`;
                    }
                }
            }

            if (!valid) {
                setData([]);
                setTopProducts([]);
                setTotalSummary({ totalRevenue: 0, totalOrders: 0, periodLabel });
                setError('');
                setLoading(false);
                return;
            }

            setLoading(true);
            setError('');

            try {
                if (type === 'day') {
                    const [reportRes, topProductsRes] = await Promise.all([
                        fetch(url),
                        fetch(`/api/report/revenue?type=top_products&month=${date.slice(0, 7)}&limit=100`)
                    ]);

                    const [reportData, topProductsData] = await Promise.all([
                        reportRes.json(),
                        topProductsRes.json()
                    ]);

                    if (!Array.isArray(reportData)) {
                        throw new Error('Dữ liệu trả về không hợp lệ');
                    }

                    const filtered = reportData.filter((item: any) => item.totalRevenue > 0 || item.totalOrders > 0);
                    setData(filtered);

                    const total = filtered.reduce((acc: any, item: any) => ({
                        totalRevenue: acc.totalRevenue + (item.totalRevenue || 0),
                        totalOrders: acc.totalOrders + (item.totalOrders || 0)
                    }), { totalRevenue: 0, totalOrders: 0 });

                    setTotalSummary({ totalRevenue: total.totalRevenue, totalOrders: total.totalOrders, periodLabel });

                    let filteredTopProducts = topProductsData
                        .sort((a: any, b: any) => (b.totalQuantity || 0) - (a.totalQuantity || 0))
                        .slice(0, 10);
                    setTopProducts(filteredTopProducts);
                } else if (type === 'month') {
                    // Lấy doanh thu từng ngày trong tháng
                    const response = await fetch(url);
                    const responseData = await response.json();
                    if (!Array.isArray(responseData)) {
                        throw new Error('Dữ liệu trả về không hợp lệ');
                    }
                    let processedData = [...responseData];
                    processedData = processedData.filter((item: any) =>
                        (item.totalRevenue || item.revenue || 0) > 0 || (item.totalOrders || item.orderCount || item.quantity || 0) > 0
                    );
                    setData(processedData);
                    const total = processedData.reduce((acc: any, item: any) => ({
                        totalRevenue: acc.totalRevenue + (item.totalRevenue || 0),
                        totalOrders: acc.totalOrders + (item.totalOrders || 0)
                    }), { totalRevenue: 0, totalOrders: 0 });
                    setTotalSummary({ totalRevenue: total.totalRevenue, totalOrders: total.totalOrders, periodLabel });
                } else {
                    const response = await fetch(url);
                    const responseData = await response.json();

                    if (!Array.isArray(responseData)) {
                        throw new Error('Dữ liệu trả về không hợp lệ');
                    }

                    let processedData = [...responseData];
                    processedData = processedData.filter((item: any) =>
                        (item.totalRevenue || item.revenue || 0) > 0 || (item.totalOrders || item.orderCount || item.quantity || 0) > 0
                    );
                    if (type === 'product') {
                        processedData.sort((a: any, b: any) =>
                            (b.orderCount || b.totalOrders || b.quantity || 0) -
                            (a.orderCount || a.totalOrders || a.quantity || 0)
                        );
                        processedData = processedData.slice(0, 10);
                    } else if (type === 'category') {
                        processedData.sort((a: any, b: any) =>
                            (b.orderCount || b.totalOrders || b.quantity || 0) -
                            (a.orderCount || a.totalOrders || a.quantity || 0)
                        );
                    } else {
                        processedData.sort((a: any, b: any) =>
                            (b.totalRevenue || 0) - (a.totalRevenue || 0)
                        );
                    }
                    setData(processedData);

                    const total = processedData.reduce((acc: any, item: any) => ({
                        totalRevenue: acc.totalRevenue + (item.totalRevenue || item.revenue || 0),
                        totalOrders: acc.totalOrders + (item.totalOrders || item.orderCount || item.quantity || 0)
                    }), { totalRevenue: 0, totalOrders: 0 });

                    setTotalSummary({ totalRevenue: total.totalRevenue, totalOrders: total.totalOrders, periodLabel });
                }
            } catch (error) {
                console.error('Lỗi khi tải dữ liệu:', error);
                setError('Lỗi tải dữ liệu');
                setData([]);
                setTotalSummary({ totalRevenue: 0, totalOrders: 0, periodLabel });
            } finally {
                setLoading(false);
            }
        };

        fetchReportData();
        setShouldFetch(false);
    }, [type, date, month, year, productId, categoryId, products, categories, fromDate, toDate, shouldFetch]);

    // Xử lý dữ liệu cho biểu đồ
    const chartData = useMemo(() => {
        if (!Array.isArray(data) || data.length === 0) return [];

        if (type === 'day') {
            return [['Hour', 'Revenue', 'Orders']].concat(
                data.map((item: any) => [
                    String(item?._id ?? '') + 'h',
                    String(Number(item?.totalRevenue) || 0),
                    String(Number(item?.totalOrders) || 0)
                ])
            );
        } else if (type === 'month') {
            // Hiển thị từng ngày trong tháng
            return [['Day', 'Revenue', 'Orders']].concat(
                data.map((item: any) => [
                    String(item?._id ?? ''),
                    String(Number(item?.totalRevenue) || 0),
                    String(Number(item?.totalOrders) || 0)
                ])
            );
        } else if (type === 'year') {
            return [['Year', 'Revenue', 'Orders']].concat(
                data.map((item: any) => [
                    String(item?._id ?? ''),
                    String(Number(item?.totalRevenue) || 0),
                    String(Number(item?.totalOrders) || 0)
                ])
            );
        } else if (type === 'product') {
            if (fromDate && toDate) {
                // Lọc theo khoảng ngày, trục X là ngày
                return [['Ngày', 'Doanh Thu', 'Số Đơn']].concat(
                    data.map((item: any) => [
                        String(item?._id ?? ''),
                        String(Number(item?.totalRevenue) || 0),
                        String(Number(item?.totalOrders) || 0)
                    ])
                );
            }
            // Tổng hợp, trục X là tên sản phẩm
            return [['Product', 'Revenue', 'Orders']].concat(
                data.map((item: any) => [
                    String(item?.name ?? ''),
                    String(Number(item?.revenue || item?.totalRevenue) || 0),
                    String(Number(item?.orderCount || item?.totalOrders || item?.quantity) || 0)
                ])
            );
        } else if (type === 'category') {
            if (fromDate && toDate) {
                // Lọc theo khoảng ngày, trục X là ngày
                return [['Ngày', 'Doanh Thu', 'Số Đơn']].concat(
                    data.map((item: any) => [
                        String(item?._id ?? ''),
                        String(Number(item?.totalRevenue) || 0),
                        String(Number(item?.totalOrders) || 0)
                    ])
                );
            }
            // Tổng hợp, trục X là tên loại sản phẩm
            return [['Category', 'Revenue', 'Orders']].concat(
                data.map((item: any) => [
                    String(item?.name ?? ''),
                    String(Number(item?.revenue || item?.totalRevenue) || 0),
                    String(Number(item?.orderCount || item?.totalOrders || item?.quantity) || 0)
                ])
            );
        }
        return [];
    }, [data, type, fromDate, toDate]);

    // Kiểm tra dữ liệu biểu đồ hợp lệ
    const isChartDataValid = useMemo(() => {
        if (!Array.isArray(chartData) || chartData.length <= 1) return false;
        try {
            // Chỉ cần có ít nhất 1 dòng có doanh thu hoặc số đơn > 0
            return chartData.slice(1).some(row =>
                Array.isArray(row) &&
                row.length === chartData[0].length &&
                typeof row[0] === 'string' &&
                (Number(row[1]) > 0 || Number(row[2]) > 0)
            );
        } catch (error) {
            console.error('Lỗi kiểm tra dữ liệu biểu đồ:', error);
            return false;
        }
    }, [chartData]);

    const hasChartData = useMemo(() => chartData.length > 1 && isChartDataValid, [chartData, isChartDataValid]);

    // Chuyển đổi dữ liệu cho Recharts
    const rechartsData = useMemo(() => {
        if (!hasChartData) return [];
        return chartData.slice(1).map(row => {
            let name = row[0];
            if (type === 'month') {
                // Nếu là dạng dd/MM/yyyy thì chỉ lấy dd/MM
                if (typeof name === 'string' && name.length >= 5) {
                    name = name.slice(0, 5);
                }
            }
            return {
                name,
                revenue: Number(row[1]),
                orders: Number(row[2])
            };
        });
    }, [chartData, hasChartData, type]);

    // Xử lý xuất Excel
    const exportToExcel = async () => {
        if (chartData.length <= 1) {
            alert('Không có dữ liệu để xuất file Excel.');
            return;
        }

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('BaoCaoDoanhThu');

        // Định nghĩa cột
        const headers = chartData[0];
        worksheet.columns = headers.map((header: string, index: number) => ({
            header,
            key: `col${index}`,
            width: index === 0 ? 30 : 20
        }));

        // Thêm dữ liệu
        chartData.slice(1).forEach((row: any) => {
            const rowData: any = {};
            row.forEach((cell: any, index: number) => {
                rowData[`col${index}`] = cell;
            });
            worksheet.addRow(rowData);
        });

        // Định dạng số cho cột doanh thu và số đơn
        worksheet.getColumn(2).numFmt = '#,##0';
        worksheet.getColumn(3).numFmt = '#,##0';

        // Tạo file và tải xuống
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `bao-cao-doanh-thu-${type}.xlsx`;
        a.click();
        window.URL.revokeObjectURL(url);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-sky-50 to-indigo-100 py-8 px-4">
            <div className="max-w-7xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
                {/* Header */}
                <div className="bg-gradient-to-r from-blue-600 via-blue-500 to-indigo-600 p-8 relative">
                    <div className="absolute top-0 left-0 w-full h-full opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                    <h1 className="text-4xl font-extrabold text-white text-center relative z-10 mb-2">
                        <FaChartLine className="inline-block mr-3 mb-1" />
                        Thống Kê Doanh Thu
                    </h1>
                    <p className="text-center text-blue-100 text-lg">{totalSummary.periodLabel}</p>
                </div>

                <div className="p-6 md:p-8">
                    {/* Form lọc báo cáo */}
                    <div className="bg-white p-6 rounded-xl shadow-md mb-8 border border-gray-100">
                        <div className="flex flex-wrap gap-4 items-center justify-between">
                            <div className="flex flex-wrap gap-4 items-center flex-1">
                                <div className="relative min-w-[240px]">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                        <FaListAlt className="text-gray-400" />
                                    </div>
                                    <select
                                        value={type}
                                        onChange={e => handleTypeChange(e.target.value)}
                                        className="block w-full pl-10 pr-10 py-3 text-base border-gray-300 bg-gray-50 focus:ring-blue-500 focus:border-blue-500 rounded-xl shadow-sm transition-all hover:bg-gray-100"
                                    >
                                        {TYPE_OPTIONS.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                </div>

                                {type === 'day' && (
                                    <div className="relative min-w-[220px]">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <FaCalendarAlt className="text-gray-400" />
                                        </div>
                                        <input
                                            type="date"
                                            value={date}
                                            onChange={e => setDate(e.target.value)}
                                            className="block w-full pl-10 pr-4 py-3 text-base border-gray-300 bg-gray-50 focus:ring-blue-500 focus:border-blue-500 rounded-xl shadow-sm transition-all hover:bg-gray-100"
                                        />
                                    </div>
                                )}

                                {type === 'year' && (
                                    <div className="relative min-w-[140px]">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <FaCalendarAlt className="text-gray-400" />
                                        </div>
                                        <input
                                            type="number"
                                            min={2000}
                                            max={2100}
                                            value={year}
                                            onChange={e => setYear(e.target.value)}
                                            placeholder="Năm"
                                            className="block w-full pl-10 pr-4 py-3 text-base border-gray-300 bg-gray-50 focus:ring-blue-500 focus:border-blue-500 rounded-xl shadow-sm transition-all hover:bg-gray-100"
                                        />
                                    </div>
                                )}

                                {type === 'month' && (
                                    <div className="relative min-w-[200px]">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <FaCalendarAlt className="text-gray-400" />
                                        </div>
                                        <input
                                            type="month"
                                            value={month}
                                            onChange={e => setMonth(e.target.value)}
                                            className="block w-full pl-10 pr-4 py-3 text-base border-gray-300 bg-gray-50 focus:ring-blue-500 focus:border-blue-500 rounded-xl shadow-sm transition-all hover:bg-gray-100"
                                        />
                                    </div>
                                )}

                                {type === 'product' && (
                                    <div className="relative min-w-[300px] flex-1">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <FaShoppingCart className="text-gray-400" />
                                        </div>
                                        <select
                                            value={productId}
                                            onChange={e => setProductId(e.target.value)}
                                            className="block w-full pl-10 pr-4 py-3 text-base border-gray-300 bg-gray-50 focus:ring-blue-500 focus:border-blue-500 rounded-xl shadow-sm transition-all hover:bg-gray-100"
                                        >
                                            <option value="">Chọn sản phẩm</option>
                                            {products.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                                        </select>
                                    </div>
                                )}

                                {type === 'category' && (
                                    <div className="relative min-w-[300px] flex-1">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                            <FaListAlt className="text-gray-400" />
                                        </div>
                                        <select
                                            value={categoryId}
                                            onChange={e => setCategoryId(e.target.value)}
                                            className="block w-full pl-10 pr-4 py-3 text-base border-gray-300 bg-gray-50 focus:ring-blue-500 focus:border-blue-500 rounded-xl shadow-sm transition-all hover:bg-gray-100"
                                        >
                                            <option value="">Chọn loại sản phẩm</option>
                                            {categories.map(c => <option key={c._id} value={c._id}>{c.name}</option>)}
                                        </select>
                                    </div>
                                )}

                                {(type === 'product' || type === 'category') && (
                                    <div className="flex gap-2 items-end">
                                        <div>
                                            <label className="block text-sm text-gray-600 mb-1">Từ ngày</label>
                                            <input
                                                type="date"
                                                value={fromDate}
                                                onChange={e => setFromDate(e.target.value)}
                                                className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                                placeholder="Từ ngày"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm text-gray-600 mb-1">Đến ngày</label>
                                            <input
                                                type="date"
                                                value={toDate}
                                                onChange={e => setToDate(e.target.value)}
                                                className="block w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                                                placeholder="Đến ngày"
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="flex gap-2 items-center">
                                <button
                                    onClick={exportToExcel}
                                    className="flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl hover:from-emerald-600 hover:to-green-700 transition-all duration-300 min-w-[160px]"
                                >
                                    <FaFileExcel className="text-white" />
                                    Xuất Excel
                                </button>
                                {(type === 'product' || type === 'category') && (
                                    <button
                                        onClick={() => setShouldFetch(true)}
                                        className="flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white font-semibold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 min-w-[120px]"
                                    >
                                        <FaChartLine className="text-white" />
                                        Lọc
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Tổng số đơn & Tổng doanh thu */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 shadow-lg border border-blue-200 transform transition-all duration-300 hover:scale-[1.02] hover:shadow-xl">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-semibold text-blue-800 mb-1">Tổng Doanh Thu</h3>
                                    <p className="text-3xl font-bold text-blue-600">{formatCurrency(totalSummary.totalRevenue)}</p>
                                </div>
                                <div className="rounded-full bg-blue-500 p-4 text-white shadow-lg">
                                    <FaDollarSign size={24} />
                                </div>
                            </div>
                        </div>
                        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 shadow-lg border border-green-200 transform transition-all duration-300 hover:scale-[1.02] hover:shadow-xl">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h3 className="text-lg font-semibold text-green-800 mb-1">Tổng Số Đơn</h3>
                                    <p className="text-3xl font-bold text-green-600">{totalSummary.totalOrders.toLocaleString('vi-VN')}</p>
                                </div>
                                <div className="rounded-full bg-green-500 p-4 text-white shadow-lg">
                                    <FaFileInvoiceDollar size={24} />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Hiển thị nội dung */}
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-64">
                            <FaSpinner className="text-blue-500 text-3xl animate-spin mb-4" />
                            <p className="text-lg text-gray-600">Đang tải dữ liệu...</p>
                        </div>
                    ) : error ? (
                        <div className="bg-red-100 text-red-700 p-4 rounded-xl text-center font-medium my-6">
                            {error}
                        </div>
                    ) : (
                        <>
                            {/* Biểu đồ */}
                            {hasChartData ? (
                                <div className="bg-white rounded-xl shadow-lg p-6 mb-8 border border-gray-100">
                                    <h2 className="text-2xl font-bold text-gray-800 mb-4 pb-2 border-b">
                                        <FaChartLine className="inline-block mr-2 text-blue-600" />
                                        Biểu Đồ {type === 'day' ? 'Doanh Thu Theo Giờ' :
                                            type === 'month' ? 'Doanh Thu Theo Tháng' :
                                                type === 'year' ? 'Doanh Thu Theo Năm' :
                                                    type === 'product' ? 'Doanh Thu Theo Sản Phẩm' :
                                                        'Doanh Thu Theo Loại Sản Phẩm'}
                                    </h2>
                                    <div className="relative" style={{ minHeight: '400px' }}>
                                        <ResponsiveContainer width="100%" height={400}>
                                            <BarChart
                                                data={rechartsData}
                                                margin={{
                                                    top: 20,
                                                    right: 30,
                                                    left: 20,
                                                    bottom: 60,
                                                }}
                                            >
                                                <CartesianGrid strokeDasharray="3 3" />
                                                <XAxis
                                                    dataKey="name"
                                                    angle={-45}
                                                    textAnchor="end"
                                                    height={60}
                                                    interval={0}
                                                />
                                                <YAxis
                                                    yAxisId="left"
                                                    orientation="left"
                                                    label={{ value: 'Doanh Thu', angle: -90, position: 'insideLeft' }}
                                                />
                                                <YAxis
                                                    yAxisId="right"
                                                    orientation="right"
                                                    label={{ value: 'Số Đơn', angle: 90, position: 'insideRight' }}
                                                />
                                                <Tooltip
                                                    formatter={(value: number, name: string) => [
                                                        name === 'revenue' ? formatCurrency(value) : value.toLocaleString('vi-VN'),
                                                        name === 'revenue' ? 'Doanh Thu' : 'Số Đơn'
                                                    ]}
                                                />
                                                <Legend />
                                                <Bar
                                                    yAxisId="left"
                                                    dataKey="revenue"
                                                    name="Doanh Thu"
                                                    fill="#3b82f6"
                                                    radius={[4, 4, 0, 0]}
                                                />
                                                <Bar
                                                    yAxisId="right"
                                                    dataKey="orders"
                                                    name="Số Đơn"
                                                    fill="#10b981"
                                                    radius={[4, 4, 0, 0]}
                                                />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-gray-500 text-center py-8 bg-white rounded-xl shadow-lg">
                                    <FaChartLine className="mx-auto text-4xl mb-4 text-gray-400" />
                                    Không có dữ liệu để hiển thị biểu đồ.
                                </div>
                            )}

                            {/* Bảng top sản phẩm */}
                            {type === 'day' && topProducts.length > 0 && (
                                <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100 mb-8">
                                    <div className="p-6 border-b border-gray-200">
                                        <h2 className="text-2xl font-bold text-gray-800">
                                            <FaShoppingCart className="inline-block mr-2 text-blue-600" />
                                            Top 10 Sản Phẩm Bán Chạy Trong Ngày
                                        </h2>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full">
                                            <thead>
                                                <tr className="bg-gradient-to-r from-blue-50 to-blue-100">
                                                    <th className="px-6 py-4 text-md font-bold text-blue-900 uppercase tracking-wider text-center">STT</th>
                                                    <th className="px-6 py-4 text-md font-bold text-blue-900 uppercase tracking-wider text-center">Sản Phẩm</th>
                                                    <th className="px-6 py-4 text-md font-bold text-blue-900 uppercase tracking-wider text-center">Số Lượng</th>
                                                    <th className="px-6 py-4 text-md font-bold text-blue-900 uppercase tracking-wider text-center">Doanh Thu</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200">
                                                {topProducts.map((item: any, idx: number) => (
                                                    <tr
                                                        key={idx}
                                                        className={`hover:bg-blue-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                                                    >
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-center text-blue-800">
                                                            {idx + 1}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-center text-gray-900">
                                                            {item?.name ?? 'Không rõ'}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-center text-gray-900">
                                                            {item?.totalQuantity?.toLocaleString('vi-VN') ?? 0}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-center text-gray-900">
                                                            {formatCurrency(item?.totalRevenue ?? 0)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Bảng dữ liệu khác */}
                            {type !== 'day' && data.length > 0 && (
                                <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
                                    <div className="p-6 border-b border-gray-200">
                                        <h2 className="text-2xl font-bold text-gray-800">
                                            <FaListAlt className="inline-block mr-2 text-blue-600" />
                                            {type === 'month' ? 'Doanh Thu Theo Tháng' :
                                                type === 'year' ? 'Doanh Thu Theo Năm' :
                                                    type === 'product' ? 'Doanh Thu Theo Sản Phẩm' :
                                                        'Doanh Thu Theo Loại Sản Phẩm'}
                                        </h2>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full">
                                            <thead>
                                                <tr className="bg-gradient-to-r from-blue-50 to-blue-100">
                                                    <th className="px-6 py-4 text-md font-bold text-blue-900 uppercase tracking-wider text-center">STT</th>
                                                    <th className="px-6 py-4 text-md font-bold text-blue-900 uppercase tracking-wider text-center">
                                                        {type === 'month' ? 'Tháng' :
                                                            type === 'year' ? 'Năm' :
                                                                type === 'product' ? 'Sản Phẩm' :
                                                                    'Loại Sản Phẩm'}
                                                    </th>
                                                    <th className="px-6 py-4 text-md font-bold text-blue-900 uppercase tracking-wider text-center">Doanh Thu</th>
                                                    <th className="px-6 py-4 text-md font-bold text-blue-900 uppercase tracking-wider text-center">Số Đơn</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200">
                                                {data.map((item: any, idx: number) => (
                                                    <tr
                                                        key={idx}
                                                        className={`hover:bg-blue-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                                                    >
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-center text-blue-800">
                                                            {idx + 1}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-center text-gray-900">
                                                            {item?.name ?? item?._id ?? 'Không rõ'}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-center text-gray-900">
                                                            {formatCurrency(item?.revenue || item?.totalRevenue || 0)}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-center text-gray-900">
                                                            {(item?.orderCount || item?.totalOrders || item?.quantity || 0).toLocaleString('vi-VN')}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Bảng dữ liệu: hiển thị từng ngày khi type === 'month' */}
                            {type === 'month' && data.length > 0 && (
                                <div className="bg-white rounded-xl shadow-lg overflow-hidden border border-gray-100">
                                    <div className="p-6 border-b border-gray-200">
                                        <h2 className="text-2xl font-bold text-gray-800">
                                            <FaListAlt className="inline-block mr-2 text-blue-600" />
                                            Doanh Thu Theo Ngày Trong Tháng
                                        </h2>
                                    </div>
                                    <div className="overflow-x-auto">
                                        <table className="min-w-full">
                                            <thead>
                                                <tr className="bg-gradient-to-r from-blue-50 to-blue-100">
                                                    <th className="px-6 py-4 text-md font-bold text-blue-900 uppercase tracking-wider text-center">STT</th>
                                                    <th className="px-6 py-4 text-md font-bold text-blue-900 uppercase tracking-wider text-center">Ngày</th>
                                                    <th className="px-6 py-4 text-md font-bold text-blue-900 uppercase tracking-wider text-center">Doanh Thu</th>
                                                    <th className="px-6 py-4 text-md font-bold text-blue-900 uppercase tracking-wider text-center">Số Đơn</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-200">
                                                {data.map((item: any, idx: number) => (
                                                    <tr
                                                        key={idx}
                                                        className={`hover:bg-blue-50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                                                    >
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-center text-blue-800">
                                                            {idx + 1}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-center text-gray-900">
                                                            {item?._id ?? 'Không rõ'}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-center text-gray-900">
                                                            {formatCurrency(item?.totalRevenue || 0)}
                                                        </td>
                                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-center text-gray-900">
                                                            {(item?.totalOrders || 0).toLocaleString('vi-VN')}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="bg-gray-50 py-4 px-8 border-t border-gray-200 text-center text-gray-500 text-sm">
                    © {new Date().getFullYear()} - Thống kê Doanh thu
                </div>
            </div>
        </div>
    );
}
