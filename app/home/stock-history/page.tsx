/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';
import React, { useEffect, useState, useMemo } from 'react';
import { StockHistoryModel } from '@/models/StockHistory';
import { fetchGetCollections } from '@/utils/fetch-get-collections';
import { IProduct } from '@/interfaces/product.interface';
import { IProductDetail } from '@/interfaces/product-detail.interface';
import { ECollectionNames } from '@/enums';
import ExcelJS from 'exceljs';

interface IStockHistory {
    _id: string;
    product_id: string;
    batch_number: string;
    action: 'import' | 'export' | 'return' | 'exchange';
    quantity: number;
    related_receipt_id?: string;
    note?: string;
    created_at: string;
    user_name?: string;
}

function formatDate(date: Date | string) {
    const d = new Date(date);
    return d.toISOString().slice(0, 10);
}

export default function StockHistoryPage() {
    const [histories, setHistories] = useState<IStockHistory[]>([]);
    const [products, setProducts] = useState<IProduct[]>([]);
    const [shouldFetch, setShouldFetch] = useState(true);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [isLoading, setIsLoading] = useState(true);

    // Lấy ngày hiện tại theo định dạng yyyy-mm-dd
    const today = new Date();
    const todayStr = today.toISOString().slice(0, 10);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().slice(0, 10);
    const [filters, setFilters] = useState({
        actionFilter: 'all',
        productFilter: '',
        search: '',
        fromDate: todayStr,
        toDate: tomorrowStr,
    });

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            if (filters.actionFilter && filters.actionFilter !== 'all') params.append('action', filters.actionFilter);
            if (filters.productFilter) params.append('product_id', filters.productFilter);
            if (filters.fromDate) params.append('fromDate', filters.fromDate);
            if (filters.toDate) params.append('toDate', filters.toDate);
            if (filters.search) params.append('search', filters.search);
            const [historiesData, productsData] = await Promise.all([
                fetch(`/api/stock-history?${params.toString()}`).then(res => res.json()),
                fetchGetCollections<IProduct>(ECollectionNames.PRODUCT)
            ]);
            setHistories(historiesData);
            setProducts(productsData);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (shouldFetch) {
            fetchData();
            setShouldFetch(false);
        }
        // eslint-disable-next-line
    }, [shouldFetch]);

    const getProductName = (id: string) => {
        const p = products.find(p => p._id === id);
        return p ? p.name : id;
    };

    // Không lọc ở client nữa, chỉ phân trang
    const paged = useMemo(() => {
        return histories.slice((page - 1) * pageSize, page * pageSize);
    }, [histories, page, pageSize]);
    const totalPage = Math.ceil(histories.length / pageSize) || 1;

    // Xuất Excel
    const handleExportExcel = async () => {
        try {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet('LichSuNhapXuatKho');

            // Định nghĩa cột
            worksheet.columns = [
                { header: 'Thời gian', key: 'time', width: 20 },
                { header: 'Sản phẩm', key: 'product', width: 30 },
                { header: 'Số lô', key: 'batch', width: 15 },
                { header: 'Loại thao tác', key: 'action', width: 15 },
                { header: 'Số lượng', key: 'quantity', width: 15 },
                { header: 'Người thực hiện', key: 'user', width: 20 },
                { header: 'Ghi chú', key: 'note', width: 30 }
            ];

            // Thêm dữ liệu
            histories.forEach(h => {
                worksheet.addRow({
                    time: new Date(h.created_at).toLocaleString('vi-VN'),
                    product: getProductName(h.product_id),
                    batch: h.batch_number,
                    action: h.action === 'import' ? 'Nhập kho' :
                        h.action === 'export' ? 'Xuất kho' :
                            h.action === 'return' ? 'Trả hàng' : 'Đổi hàng',
                    quantity: h.quantity,
                    user: h.user_name || '',
                    note: h.note || ''
                });
            });

            // Định dạng số cho cột số lượng
            worksheet.getColumn('quantity').numFmt = '#,##0';

            // Tạo file và tải xuống
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'lich_su_nhap_xuat_kho.xlsx';
            a.click();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Lỗi khi xuất Excel:', error);
            alert('Có lỗi xảy ra khi xuất file Excel. Vui lòng thử lại.');
        }
    };

    // Style cho từng loại thao tác
    const getActionStyle = (action: string) => {
        switch (action) {
            case 'import':
                return 'bg-green-100 text-green-800 border-green-300';
            case 'export':
                return 'bg-blue-100 text-blue-800 border-blue-300';
            case 'return':
                return 'bg-amber-100 text-amber-800 border-amber-300';
            case 'exchange':
                return 'bg-purple-100 text-purple-800 border-purple-300';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-300';
        }
    };

    const getActionName = (action: string) => {
        switch (action) {
            case 'import': return 'Nhập kho';
            case 'export': return 'Xuất kho';
            case 'return': return 'Trả hàng';
            case 'exchange': return 'Đổi hàng';
            default: return action;
        }
    };

    return (
        <div className="max-w-8xl mx-auto p-6">
            {/* Tiêu đề */}
            <h1 className="text-3xl font-bold mb-8 text-center bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent py-2">
                Lịch sử nhập/xuất kho
            </h1>

            {/* Card chứa bộ lọc */}
            <div className="bg-white rounded-xl shadow-md p-6 mb-6 border border-gray-200">
                <h2 className="text-lg font-semibold mb-4 text-gray-700">Bộ lọc</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                        <label className="block text-lg font-medium text-gray-700 mb-1">Loại thao tác</label>
                        <select
                            value={filters.actionFilter}
                            onChange={e => setFilters(f => ({ ...f, actionFilter: e.target.value }))}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        >
                            <option value="all">Tất cả</option>
                            <option value="import">Nhập kho</option>
                            <option value="export">Xuất kho</option>
                            <option value="return">Trả hàng</option>
                            <option value="exchange">Đổi hàng</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-lg font-medium text-gray-700 mb-1">Sản phẩm</label>
                        <select
                            value={filters.productFilter}
                            onChange={e => setFilters(f => ({ ...f, productFilter: e.target.value }))}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        >
                            <option value="">Tất cả sản phẩm</option>
                            {products.map(p => (
                                <option key={p._id} value={p._id}>{p.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-lg font-medium text-gray-700 mb-1">Tìm kiếm</label>
                        <input
                            value={filters.search}
                            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
                            placeholder="Tìm sản phẩm theo số lô"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-lg font-medium text-gray-700 mb-1">Từ ngày</label>
                        <input
                            type="date"
                            value={filters.fromDate}
                            onChange={e => setFilters(f => ({ ...f, fromDate: e.target.value }))}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-lg font-medium text-gray-700 mb-1">Đến ngày</label>
                        <input
                            type="date"
                            value={filters.toDate}
                            onChange={e => setFilters(f => ({ ...f, toDate: e.target.value }))}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        />
                    </div>
                    <div className="flex items-end gap-2">
                        <button
                            onClick={() => setShouldFetch(true)}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-lg transition-colors duration-300 flex items-center justify-center gap-2 shadow-sm hover:shadow"
                        >
                            Lọc dữ liệu
                        </button>
                        <button
                            onClick={handleExportExcel}
                            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-lg transition-colors duration-300 flex items-center justify-center gap-2 shadow-sm hover:shadow"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                            </svg>
                            Xuất Excel
                        </button>
                    </div>
                </div>
            </div>

            {/* Card chứa dữ liệu */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                {isLoading ? (
                    <div className="flex justify-center items-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
                        <span className="ml-3 text-gray-500 text-lg">Đang tải dữ liệu...</span>
                    </div>
                ) : (
                    <>
                        <div className="overflow-x-auto">
                            <table className="min-w-full bg-white text-lg">
                                <thead>
                                    <tr className="bg-gray-50 border-b">
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Thời gian</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Sản phẩm</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Số lô</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Loại thao tác</th>
                                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Số lượng</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Người thực hiện</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Ghi chú</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {paged.map(h => (
                                        <tr key={h._id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-lg text-gray-600">
                                                {new Date(h.created_at).toLocaleString('vi-VN')}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-lg font-medium text-gray-900">
                                                {getProductName(h.product_id)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-lg text-gray-600">
                                                {h.batch_number}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`px-3 py-1 inline-flex text-lg leading-5 font-medium rounded-full border ${getActionStyle(h.action)}`}>
                                                    {getActionName(h.action)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-lg text-right font-semibold">
                                                {h.quantity}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-lg text-gray-600">
                                                {h.user_name || ''}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-lg text-gray-600">
                                                {h.note || ''}
                                            </td>
                                        </tr>
                                    ))}
                                    {paged.length === 0 && (
                                        <tr>
                                            <td colSpan={6} className="text-center py-12 text-gray-500 bg-gray-50 text-lg">
                                                <div className="flex flex-col items-center">
                                                    <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                                                    </svg>
                                                    <span className="mt-2 font-medium">Không có dữ liệu</span>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Phân trang */}
                        <div className="flex justify-between items-center bg-gray-50 px-6 py-4 border-t border-gray-200">
                            <div className="flex items-center">
                                <span className="text-lg text-gray-700 mr-2">Hiển thị</span>
                                <select
                                    value={pageSize}
                                    onChange={e => { setPageSize(Number(e.target.value)); setPage(1); }}
                                    className="border border-gray-300 rounded px-2 py-1 text-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                >
                                    {[10, 20, 50, 100].map(size => <option key={size} value={size}>{size}</option>)}
                                </select>
                                <span className="text-lg text-gray-700 ml-2">dòng mỗi trang</span>
                            </div>

                            <div className="flex items-center space-x-2">
                                <span className="text-lg text-gray-700">Trang {page} / {totalPage}</span>
                                <div className="flex space-x-1">
                                    <button
                                        disabled={page === 1}
                                        onClick={() => setPage(1)}
                                        className="px-3 py-1 rounded border bg-white text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                                    >
                                        &laquo;
                                    </button>
                                    <button
                                        disabled={page === 1}
                                        onClick={() => setPage(page - 1)}
                                        className="px-3 py-1 rounded border bg-white text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                                    >
                                        &lsaquo;
                                    </button>
                                    <button
                                        disabled={page === totalPage}
                                        onClick={() => setPage(page + 1)}
                                        className="px-3 py-1 rounded border bg-white text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                                    >
                                        &rsaquo;
                                    </button>
                                    <button
                                        disabled={page === totalPage}
                                        onClick={() => setPage(totalPage)}
                                        className="px-3 py-1 rounded border bg-white text-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                                    >
                                        &raquo;
                                    </button>
                                </div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
} 