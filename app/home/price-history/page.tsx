'use client';

import React, { useEffect, useState } from 'react';
import { fetchGetCollections } from '@/utils/fetch-get-collections';
import { IProduct } from '@/interfaces/product.interface';
import { ECollectionNames } from '@/enums';
import ExcelJS from 'exceljs';

interface IPriceHistory {
    _id: string;
    product_id: string;
    old_input_price: number;
    new_input_price: number;
    old_output_price: number;
    new_output_price: number;
    changed_at: string;
    note?: string;
    user_name?: string;
}

export default function PriceHistoryPage() {
    const [histories, setHistories] = useState<IPriceHistory[]>([]);
    const [products, setProducts] = useState<IProduct[]>([]);
    const [filters, setFilters] = useState({
        productFilter: '',
        search: '',
        fromDate: getToday(),
        toDate: getToday(),
    });
    const [shouldFetch, setShouldFetch] = useState(true);
    const [page, setPage] = useState(1);
    const [pageSize, setPageSize] = useState(20);
    const [isLoading, setIsLoading] = useState(true);


    function getToday() {
        const d = new Date();
        const month = (d.getMonth() + 1).toString().padStart(2, '0');
        const day = d.getDate().toString().padStart(2, '0');
        return `${d.getFullYear()}-${month}-${day}`;
    }

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams();
            if (filters.productFilter) params.append('product_id', filters.productFilter);
            if (filters.fromDate) params.append('fromDate', filters.fromDate);
            if (filters.toDate) params.append('toDate', filters.toDate);
            if (filters.search) params.append('search', filters.search);
            const [historiesData, productsData] = await Promise.all([
                fetch(`/api/price-history?${params.toString()}`).then(res => res.json()),
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

    const filtered = histories.filter(h => {
        if (filters.productFilter && h.product_id !== filters.productFilter) return false;
        if (filters.fromDate && new Date(h.changed_at) < new Date(filters.fromDate)) return false;
        if (filters.toDate && new Date(h.changed_at) > new Date(filters.toDate + 'T23:59:59')) return false;
        if (filters.search) {
            const name = getProductName(h.product_id).toLowerCase();
            if (!name.includes(filters.search.toLowerCase())) return false;
        }
        return true;
    });

    // Phân trang
    const totalPage = Math.ceil(filtered.length / pageSize) || 1;
    const paged = filtered.slice((page - 1) * pageSize, page * pageSize);

    const formatCurrency = (v: number) => v?.toLocaleString('vi-VN') + '₫';

    // Kiểm tra giá tăng hay giảm
    const getPriceChangeStyle = (oldPrice: number, newPrice: number) => {
        if (newPrice > oldPrice) {
            return 'text-green-600 font-semibold';
        } else if (newPrice < oldPrice) {
            return 'text-red-600 font-semibold';
        }
        return 'text-gray-600';
    };

    // Xuất Excel
    const handleExportExcel = async () => {
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('LichSuGia');

        // Định nghĩa cột
        worksheet.columns = [
            { header: 'Thời gian', key: 'time', width: 20 },
            { header: 'Sản phẩm', key: 'product', width: 30 },
            { header: 'Giá nhập cũ', key: 'oldInput', width: 15 },
            { header: 'Giá nhập mới', key: 'newInput', width: 15 },
            { header: 'Giá bán cũ', key: 'oldOutput', width: 15 },
            { header: 'Giá bán mới', key: 'newOutput', width: 15 },
            { header: 'Người thực hiện', key: 'user', width: 20 },
            { header: 'Ghi chú', key: 'note', width: 30 }
        ];

        // Thêm dữ liệu
        histories.forEach(h => {
            worksheet.addRow({
                time: new Date(h.changed_at).toLocaleString('vi-VN'),
                product: getProductName(h.product_id),
                oldInput: formatCurrency(h.old_input_price),
                newInput: formatCurrency(h.new_input_price),
                oldOutput: formatCurrency(h.old_output_price),
                newOutput: formatCurrency(h.new_output_price),
                user: h.user_name || '',
                note: h.note || ''
            });
        });

        // Tạo file và tải xuống
        const buffer = await workbook.xlsx.writeBuffer();
        const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'lich_su_gia.xlsx';
        a.click();
        window.URL.revokeObjectURL(url);
    };

    return (
        <div className="max-w-8xl mx-auto p-6">
            {/* Tiêu đề */}
            <h1 className="text-3xl font-bold mb-8 text-center bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent py-2">
                Lịch sử cập nhật giá
            </h1>

            {/* Card chứa bộ lọc */}
            <div className="bg-white rounded-xl shadow-md p-6 mb-6 border border-gray-200">
                <h2 className="text-lg font-semibold mb-4 text-gray-700">Bộ lọc</h2>
                <form
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end"
                    onSubmit={e => { e.preventDefault(); setShouldFetch(true); }}
                >
                    <div>
                        <label className="block text-base font-medium text-gray-700 mb-1">Sản phẩm</label>
                        <select
                            value={filters.productFilter}
                            onChange={e => setFilters(f => ({ ...f, productFilter: e.target.value }))}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                        >
                            <option value="">Tất cả sản phẩm</option>
                            {products.map(p => (
                                <option key={p._id} value={p._id}>{p.name}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-base font-medium text-gray-700 mb-1">Tìm kiếm</label>
                        <input
                            value={filters.search}
                            onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
                            placeholder="Tên sản phẩm"
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-base font-medium text-gray-700 mb-1">Từ ngày</label>
                        <input
                            type="date"
                            value={filters.fromDate}
                            onChange={e => setFilters(f => ({ ...f, fromDate: e.target.value }))}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                        />
                    </div>
                    <div>
                        <label className="block text-base font-medium text-gray-700 mb-1">Đến ngày</label>
                        <input
                            type="date"
                            value={filters.toDate}
                            onChange={e => setFilters(f => ({ ...f, toDate: e.target.value }))}
                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-base focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                        />
                    </div>
                    <div className="md:col-span-2 lg:col-span-4 flex justify-center gap-4 mt-2">
                        <button
                            type="submit"
                            className="w-full md:w-auto bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-8 py-2 rounded-lg text-lg font-semibold shadow transition-colors duration-300 flex items-center justify-center gap-2"
                        >
                            Lọc dữ liệu
                        </button>
                        <button
                            type="button"
                            onClick={handleExportExcel}
                            className="w-full md:w-auto bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white px-8 py-2 rounded-lg text-lg font-semibold shadow transition-colors duration-300 flex items-center justify-center gap-2"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                            </svg>
                            Xuất Excel
                        </button>
                    </div>
                </form>
            </div>

            {/* Card chứa dữ liệu */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
                {isLoading ? (
                    <div className="flex justify-center items-center py-20">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-purple-500"></div>
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
                                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Giá nhập cũ</th>
                                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Giá nhập mới</th>
                                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Giá bán cũ</th>
                                        <th className="px-6 py-3 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">Giá bán mới</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Người thực hiện</th>
                                        <th className="px-6 py-3 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Ghi chú</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200">
                                    {paged.map(h => (
                                        <tr key={h._id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-lg text-gray-600">
                                                {new Date(h.changed_at).toLocaleString('vi-VN')}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-lg font-medium text-gray-900">
                                                {getProductName(h.product_id)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-lg text-right text-gray-600">
                                                {formatCurrency(h.old_input_price)}
                                            </td>
                                            <td className={`px-6 py-4 whitespace-nowrap text-lg text-right ${getPriceChangeStyle(h.old_input_price, h.new_input_price)}`}>
                                                {formatCurrency(h.new_input_price)}
                                                {h.new_input_price > h.old_input_price && (
                                                    <span className="ml-1 text-xs">↑</span>
                                                )}
                                                {h.new_input_price < h.old_input_price && (
                                                    <span className="ml-1 text-xs">↓</span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-lg text-right text-gray-600">
                                                {formatCurrency(h.old_output_price)}
                                            </td>
                                            <td className={`px-6 py-4 whitespace-nowrap text-lg text-right ${getPriceChangeStyle(h.old_output_price, h.new_output_price)}`}>
                                                {formatCurrency(h.new_output_price)}
                                                {h.new_output_price > h.old_output_price && (
                                                    <span className="ml-1 text-xs">↑</span>
                                                )}
                                                {h.new_output_price < h.old_output_price && (
                                                    <span className="ml-1 text-xs">↓</span>
                                                )}
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
                                            <td colSpan={7} className="text-center py-12 text-gray-500 bg-gray-50">
                                                <div className="flex flex-col items-center">
                                                    <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
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
                                    className="border border-gray-300 rounded px-2 py-1 text-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
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
                                        className="px-3 py-1 rounded border bg-white text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                                    >
                                        &laquo;
                                    </button>
                                    <button
                                        disabled={page === 1}
                                        onClick={() => setPage(page - 1)}
                                        className="px-3 py-1 rounded border bg-white text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                                    >
                                        &lsaquo;
                                    </button>
                                    <button
                                        disabled={page === totalPage}
                                        onClick={() => setPage(page + 1)}
                                        className="px-3 py-1 rounded border bg-white text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                                    >
                                        &rsaquo;
                                    </button>
                                    <button
                                        disabled={page === totalPage}
                                        onClick={() => setPage(totalPage)}
                                        className="px-3 py-1 rounded border bg-white text-sm disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
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