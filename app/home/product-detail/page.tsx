/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { IProduct } from '@/interfaces/product.interface';
import { formatCurrency } from '@/utils/format-currency';
import { useState, useEffect, useRef } from 'react';
import { ChevronDownIcon, ChevronUpIcon, EyeIcon } from '@heroicons/react/24/outline';
import { IProductDetail } from '@/interfaces/product-detail.interface';
import BarcodeComponent from '@/components/barcode/barcode';
import dynamic from 'next/dynamic';


const DynamicReactBarcode = dynamic(() => import('react-barcode'), { ssr: false });

interface ProductDetailInGroup extends Omit<IProductDetail, 'product'> {
  product: IProduct;
}

interface ProductGroup {
  name: string;
  details: ProductDetailInGroup[];
  totalStock: number;
  totalImport: number;
  totalExport: number;
}

// Định nghĩa type cho ProductGroup có _id
type ProductGroupWithId = ProductGroup & { _id: string };

function ProductDetail() {
  const [products, setProducts] = useState<IProduct[]>([]);
  const [productDetails, setProductDetails] = useState<IProductDetail[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<ProductGroup | null>(null);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const itemsPerPage = 10;
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'lowStock' | 'expiringSoon' | 'expired'>('all');
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const [productsResponse, detailsResponse] = await Promise.all([
          fetch('/api/product'),
          fetch('/api/product-detail')
        ]);

        const productsData = await productsResponse.json();
        const detailsData = await detailsResponse.json();

        setProducts(productsData);
        setProductDetails(detailsData);
      } catch (error) {
        console.error('Lỗi khi tải dữ liệu:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Nhóm sản phẩm theo tên
  const groupedProducts = products.reduce((groups: Record<string, ProductGroup>, product) => {
    const groupName = product.name;
    if (!groups[groupName]) {
      groups[groupName] = {
        name: groupName,
        details: [],
        totalStock: 0,
        totalImport: 0,
        totalExport: 0
      };
    }

    const details = productDetails.filter(detail => detail.product_id === product._id);

    // Thêm từng chi tiết sản phẩm vào nhóm
    details.forEach(detail => {
      const detailWithProduct = {
        ...detail,
        product: product
      } as ProductDetailInGroup;

      groups[groupName].details.push(detailWithProduct);
      groups[groupName].totalStock += (detail.input_quantity - detail.output_quantity);
      groups[groupName].totalImport += detail.input_quantity;
      groups[groupName].totalExport += detail.output_quantity;
    });

    return groups;
  }, {});

  // Sắp xếp các nhóm theo tên
  let sortedGroups = Object.values(groupedProducts);
  if (sortConfig) {
    sortedGroups = [...sortedGroups].sort((a, b) => {
      let aValue: any = a[sortConfig.key as keyof ProductGroup];
      let bValue: any = b[sortConfig.key as keyof ProductGroup];
      if (sortConfig.key === 'name') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      } else {
        if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      }
    });
  } else {
    sortedGroups = sortedGroups.sort((a, b) => a.name.localeCompare(b.name));
  }
  // Lọc các nhóm có chi tiết trước khi phân trang
  const filteredGroups = sortedGroups.filter(group => {
    // Tìm kiếm theo tên
    if (searchTerm && !group.name.toLowerCase().includes(searchTerm.toLowerCase())) {
      return false;
    }
    // Lọc theo loại
    if (filterType === 'lowStock') {
      return group.totalStock > 0 && group.totalStock <= 10;
    }
    if (filterType === 'expiringSoon') {
      // Có ít nhất 1 detail sắp hết hạn
      return group.details.some(detail => {
        const date = new Date(detail.expiry_date);
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        return date > now && Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) <= 30;
      });
    }
    if (filterType === 'expired') {
      // Có ít nhất 1 detail đã hết hạn
      return group.details.some(detail => {
        const date = new Date(detail.expiry_date);
        const now = new Date();
        now.setHours(0, 0, 0, 0);
        return date < now;
      });
    }
    return group.details.length > 0;
  });
  const totalPages = Math.max(1, Math.ceil(filteredGroups.length / itemsPerPage));
  const paginatedGroups = filteredGroups.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleViewDetails = (group: ProductGroup) => {
    setSelectedGroup(group);
    setIsDetailModalOpen(true);
  };

  const closeDetailModal = () => {
    setIsDetailModalOpen(false);
    setSelectedGroup(null);
  };

  return (
    <div className="h-full w-full px-6 py-5 bg-gray-50">
      <div className="flex flex-col w-full space-y-4">
        {/* Tiêu đề lớn */}
        <h1 className="text-3xl font-bold text-blue-600 mb-2 uppercase tracking-wide text-center animate-fadeIn">
          Báo cáo tồn kho sản phẩm
        </h1>

        {/* Bộ lọc và tìm kiếm */}
        <div className="flex flex-wrap gap-4 items-center mb-4 border-b pb-4">
          <div className="relative flex-grow max-w-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              placeholder="Tìm kiếm tên sản phẩm..."
              className="block w-full pl-10 pr-3 py-2 text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 transition-all duration-300"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
            />
          </div>

          <select
            className="border border-gray-300 rounded-lg py-2 px-3 text-lg focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300 transition-all duration-300"
            value={filterType}
            onChange={e => setFilterType(e.target.value as any)}
          >
            <option value="all">Tất cả</option>
            <option value="lowStock">Tồn kho thấp (&le; 10)</option>
            <option value="expiringSoon">Sắp hết hạn (&le; 30 ngày)</option>
            <option value="expired">Đã hết hạn</option>
          </select>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-96 bg-white rounded-xl shadow-sm">
            <div className="flex flex-col items-center">
              <svg className="animate-spin h-16 w-16 text-blue-600 mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
              </svg>
              <p className="text-blue-600 text-xl font-medium">Đang tải dữ liệu...</p>
            </div>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto rounded-2xl shadow-sm border border-gray-200 bg-white transform transition-all duration-300 hover:shadow-md">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-blue-600">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-center text-lg font-medium text-white uppercase tracking-wider rounded-tl-2xl">#</th>
                    <th scope="col" className="px-6 py-3 text-left text-lg font-medium text-white uppercase tracking-wider cursor-pointer select-none"
                      onClick={() => {
                        setSortConfig(prev => {
                          if (prev?.key === 'name') {
                            return { key: 'name', direction: prev.direction === 'asc' ? 'desc' : 'asc' };
                          }
                          return { key: 'name', direction: 'asc' };
                        });
                      }}
                    >
                      Tên sản phẩm {sortConfig?.key === 'name' && (sortConfig.direction === 'asc' ? ' ▲' : ' ▼')}
                    </th>
                    <th scope="col" className="px-6 py-3 text-center text-lg font-medium text-white uppercase tracking-wider cursor-pointer select-none"
                      onClick={() => {
                        setSortConfig(prev => {
                          if (prev?.key === 'totalStock') {
                            return { key: 'totalStock', direction: prev.direction === 'asc' ? 'desc' : 'asc' };
                          }
                          return { key: 'totalStock', direction: 'asc' };
                        });
                      }}
                    >
                      Số lượng tồn kho {sortConfig?.key === 'totalStock' && (sortConfig.direction === 'asc' ? ' ▲' : ' ▼')}
                    </th>
                    <th scope="col" className="px-6 py-3 text-center text-lg font-medium text-white uppercase tracking-wider">
                      Số lượng nhập
                    </th>
                    <th scope="col" className="px-6 py-3 text-center text-lg font-medium text-white uppercase tracking-wider">
                      Số lượng xuất
                    </th>
                    <th scope="col" className="px-6 py-3 text-center text-lg font-medium text-white uppercase tracking-wider rounded-tr-2xl">
                      Thao tác
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {paginatedGroups.map((group, idx) => {
                    const isLowStock = group.totalStock <= 10;
                    let rowClass = "hover:bg-blue-50 transition-all duration-200";

                    // Thêm màu nền vàng cho hàng có tồn kho thấp
                    if (isLowStock) rowClass += " bg-yellow-50";

                    return (
                      <tr key={`${group.name}-${idx}`} className={rowClass}>
                        <td className="px-6 py-4 whitespace-nowrap text-center font-medium text-gray-900 text-lg">
                          {(currentPage - 1) * itemsPerPage + idx + 1}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex flex-col">
                            <div className="text-lg font-medium text-gray-900">{group.name}</div>
                            <div className="text-base text-gray-500">{group.details.length} sản phẩm</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className={`inline-flex justify-center items-center px-3 py-1.5 rounded-full text-lg font-medium ${isLowStock
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-blue-100 text-blue-800'
                            } transform transition-all duration-300 hover:scale-110`}>
                            {group.totalStock}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="inline-flex justify-center items-center px-3 py-1.5 rounded-full text-lg font-medium bg-green-100 text-green-800 transform transition-all duration-300 hover:scale-110">
                            {group.totalImport}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <span className="inline-flex justify-center items-center px-3 py-1.5 rounded-full text-lg font-medium bg-orange-100 text-orange-800 transform transition-all duration-300 hover:scale-110">
                            {group.totalExport}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-lg font-medium">
                          <button
                            onClick={() => handleViewDetails(group)}
                            className="inline-flex items-center px-4 py-2 border border-transparent rounded-full shadow-sm text-lg font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none transition-all duration-300 transform hover:scale-105"
                          >
                            <EyeIcon className="w-5 h-5 mr-2" />
                            Xem chi tiết
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Phân trang */}
            <div className="flex justify-center mt-4">
              <nav className="inline-flex rounded-md shadow-sm -space-x-px" aria-label="Pagination">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-3 py-2 rounded-l-md border border-gray-300 bg-white text-lg font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 transition-colors duration-300"
                >
                  <span className="sr-only">Đầu</span>
                  Đầu
                </button>
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNumber;
                  if (currentPage <= 3 || totalPages <= 5) {
                    pageNumber = i + 1;
                  } else if (currentPage >= totalPages - 2) {
                    pageNumber = totalPages - 4 + i;
                  } else {
                    pageNumber = currentPage - 2 + i;
                  }

                  return (
                    <button
                      key={pageNumber}
                      onClick={() => setCurrentPage(pageNumber)}
                      className={`relative inline-flex items-center px-4 py-2 border text-lg ${currentPage === pageNumber
                        ? 'z-10 bg-blue-50 border-blue-500 text-blue-600 font-medium'
                        : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50 font-medium'
                        } transition-colors duration-300`}
                    >
                      {pageNumber}
                    </button>
                  );
                })}
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="relative inline-flex items-center px-3 py-2 rounded-r-md border border-gray-300 bg-white text-lg font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 transition-colors duration-300"
                >
                  <span className="sr-only">Cuối</span>
                  Cuối
                </button>
              </nav>
            </div>
          </>
        )}

        {/* Modal xem chi tiết */}
        {isDetailModalOpen && selectedGroup && (
          <div className="fixed inset-0 z-50 overflow-y-auto bg-black bg-opacity-50">
            <div className="flex min-h-screen items-center justify-center p-4">
              <div className="relative bg-white rounded-lg shadow-xl w-11/12 max-w-7xl animate-fadeInUp">
                <div className="absolute top-0 right-0 pt-4 pr-4">
                  <button
                    onClick={closeDetailModal}
                    className="bg-white rounded-md text-gray-400 hover:text-gray-500 focus:outline-none transition-colors duration-300"
                  >
                    <span className="sr-only">Đóng</span>
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="p-6">
                  <div className="mb-6">
                    <h2 className="text-2xl font-semibold text-center text-blue-600">{selectedGroup?.name}</h2>
                    <div className="flex flex-wrap gap-4 mt-4 justify-center">
                      <div className="px-4 py-2">
                        <span className="text-lg text-gray-700">Tổng tồn kho:</span>
                        <span className="ml-2 inline-flex justify-center items-center px-3 py-1.5 rounded-full text-lg font-medium bg-blue-100 text-blue-800 transform transition-all duration-300 hover:scale-105">
                          {selectedGroup?.totalStock}
                        </span>
                      </div>
                      <div className="px-4 py-2">
                        <span className="text-lg text-gray-700">Tổng nhập:</span>
                        <span className="ml-2 inline-flex justify-center items-center px-3 py-1.5 rounded-full text-lg font-medium bg-green-100 text-green-800 transform transition-all duration-300 hover:scale-105">
                          {selectedGroup?.totalImport}
                        </span>
                      </div>
                      <div className="px-4 py-2">
                        <span className="text-lg text-gray-700">Tổng xuất:</span>
                        <span className="ml-2 inline-flex justify-center items-center px-3 py-1.5 rounded-full text-lg font-medium bg-orange-100 text-orange-800 transform transition-all duration-300 hover:scale-105">
                          {selectedGroup?.totalExport}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-lg border border-gray-200 transform transition-all duration-300 hover:shadow-md">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-blue-600">
                        <tr>
                          <th scope="col" className="px-6 py-3 text-center text-lg font-medium text-white uppercase tracking-wider">
                            Barcode
                          </th>
                          <th scope="col" className="px-6 py-3 text-center text-lg font-medium text-white uppercase tracking-wider">
                            Tồn kho
                          </th>
                          <th scope="col" className="px-6 py-3 text-center text-lg font-medium text-white uppercase tracking-wider">
                            SL nhập
                          </th>
                          <th scope="col" className="px-6 py-3 text-center text-lg font-medium text-white uppercase tracking-wider">
                            SL xuất
                          </th>
                          <th scope="col" className="px-6 py-3 text-center text-lg font-medium text-white uppercase tracking-wider">
                            Ngày SX
                          </th>
                          <th scope="col" className="px-6 py-3 text-center text-lg font-medium text-white uppercase tracking-wider">
                            Hạn SD
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {selectedGroup?.details.map((detail) => {
                          const date = new Date(detail.expiry_date);
                          const now = new Date();
                          now.setHours(0, 0, 0, 0);
                          const isExpired = date < now;
                          const isExpiringSoon = date > now && Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) <= 30;
                          const isLowStock = (detail.input_quantity - detail.output_quantity) < 10;

                          let rowClass = "hover:bg-blue-50 transition-all duration-200";
                          let statusText = null;

                          // Thêm màu nền cho hàng trong bảng chi tiết
                          if (isExpired) {
                            rowClass += " bg-red-50";
                            statusText = <span className="text-lg text-red-600 font-medium animate-pulse">Đã hết hạn</span>;
                          } else if (isExpiringSoon) {
                            rowClass += " bg-yellow-50";
                            statusText = <span className="text-lg text-yellow-600 font-medium">Sắp hết hạn</span>;
                          } else if (isLowStock) {
                            rowClass += " bg-yellow-50";
                            statusText = <span className="text-lg text-yellow-600 font-medium">Tồn kho thấp</span>;
                          }

                          return (
                            <tr key={detail._id} className={rowClass}>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
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
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <span className={`inline-flex justify-center items-center px-3 py-1.5 rounded-full text-lg font-medium ${isLowStock
                                  ? 'bg-yellow-100 text-yellow-800'
                                  : 'bg-blue-100 text-blue-800'
                                  } transform transition-all duration-300 hover:scale-110`}>
                                  {detail.input_quantity - detail.output_quantity}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <span className="inline-flex justify-center items-center px-3 py-1.5 rounded-full text-lg font-medium bg-green-100 text-green-800 transform transition-all duration-300 hover:scale-110">
                                  {detail.input_quantity}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <span className="inline-flex justify-center items-center px-3 py-1.5 rounded-full text-lg font-medium bg-orange-100 text-orange-800 transform transition-all duration-300 hover:scale-110">
                                  {detail.output_quantity}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center text-lg text-gray-700">
                                {new Date(detail.date_of_manufacture).toLocaleDateString('vi-VN')}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-center">
                                <div className="flex flex-col items-center">
                                  <span className="text-lg text-gray-700">
                                    {new Date(detail.expiry_date).toLocaleDateString('vi-VN')}
                                  </span>
                                  {statusText}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Thêm CSS global cho animation
const styles = `
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fadeIn {
  animation: fadeIn 0.5s ease-in-out;
}

.animate-fadeInUp {
  animation: fadeInUp 0.5s ease-in-out;
}
`;

// Thêm style vào component
ProductDetail.getInitialProps = async () => {
  return { styles: <style>{styles}</style> };
};

export default ProductDetail;