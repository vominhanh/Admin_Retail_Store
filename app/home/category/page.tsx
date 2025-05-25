'use client';

import { Button, IconContainer, TextInput } from '@/components'
import React, { ChangeEvent, useEffect, useState } from 'react'
import { fetchGetCollections } from '@/utils/fetch-get-collections';
import { ECollectionNames } from '@/enums';
import { addCollection, deleteCollectionById, getCollectionById, updateCollectionById } from '@/services/api-service';
import { LoadingScreen } from '@/components';
import { boxIcon, infoIcon, pencilIcon, trashIcon, userIcon } from '@/public';
import { ICategory } from '@/interfaces/category.interface';
import { DEFAULT_CATEGORY } from '@/constants/category.constant';
import { EButtonType } from '@/components/button/interfaces/button-type.interface';
import NumberInput from '@/components/number-input/number-input';

// Hàm tạo mã loại sản phẩm  theo định dạng DV-(NgayThangNam)-0001
const generateCategoryId = (index: number): string => {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const year = today.getFullYear();
  const dateStr = `${day}${month}${year}`;
  const sequenceNumber = String(index + 1).padStart(4, '0');
  return `DV-${dateStr}-${sequenceNumber}`;
};

export default function CategoryPage() {
  const [category, setCategory] = useState<ICategory>({ ...DEFAULT_CATEGORY });
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
  const [selectedCategory, setSelectedCategory] = useState<ICategory | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Fetch dữ liệu từ API khi trang được load
  useEffect(() => {
    fetchCategory();
  }, []);

  // Hàm lấy dữ liệu từ API
  const fetchCategory = async () => {
    setIsLoading(true);
    try {
      const fetchCategories = await fetchGetCollections<ICategory>(ECollectionNames.CATEGORY);
      setCategories(fetchCategories);
    } catch (error) {
      console.error('Lỗi khi lấy dữ liệu loại sản phẩm :', error);
      alert('Không thể lấy dữ liệu loại sản phẩm . Vui lòng thử lại sau!');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangeCategory = (e: ChangeEvent<HTMLInputElement>): void => {
    setCategory({
      ...category,
      [e.target.name]: e.target.name === "discount" ? Number(e.target.value) : e.target.value,
    });
  }

  // Thêm hoặc cập nhật loại sản phẩm 
  const handleSaveCategory = async (): Promise<void> => {
    if (!category.name.trim()) {
      alert('Vui lòng nhập tên loại sản phẩm ');
      return;
    }

    setIsLoading(true);
    try {
      if (isEditing) {
        // Cập nhật loại sản phẩm  đã có
        await updateCollectionById<ICategory>(category, category._id, ECollectionNames.CATEGORY);
        alert('Cập nhật loại sản phẩm thành công!');
      } else {
        // Thêm loại sản phẩm  mới
        await addCollection<ICategory>(category, ECollectionNames.CATEGORY);
        alert('Thêm loại sản phẩm thành công!');
      }

      // Làm mới danh sách loại sản phẩm 
      await fetchCategory();

      // Reset form
      resetForm();
    } catch (error) {
      console.error('Lỗi khi lưu loại sản phẩm :', error);
      alert('Không thể lưu loại sản phẩm . Vui lòng thử lại sau!');
    } finally {
      setIsLoading(false);
    }
  }

  const resetForm = () => {
    setCategory({
      ...DEFAULT_CATEGORY,
      _id: generateCategoryId(categories.length + 1)
    });
    setIsEditing(false);
  }

  const handleEditCategory = async (id: string): Promise<void> => {
    setIsLoading(true);
    try {
      const response = await getCollectionById(id, ECollectionNames.CATEGORY);
      if (response.ok) {
        const categoryData = await response.json();
        setCategory(categoryData);
        setIsEditing(true);
      } else {
        throw new Error('Không thể lấy thông tin loại sản phẩm ');
      }
    } catch (error) {
      console.error('Lỗi khi lấy thông tin loại sản phẩm :', error);
      alert('Không thể lấy thông tin loại sản phẩm . Vui lòng thử lại sau!');
    } finally {
      setIsLoading(false);
    }
  }

  const handleViewDetail = async (id: string): Promise<void> => {
    setIsLoading(true);
    try {
      const response = await getCollectionById(id, ECollectionNames.CATEGORY);
      if (response.ok) {
        const categoryData = await response.json();

        setSelectedCategory(categoryData);
        setShowDetailModal(true);
      } else {
        throw new Error('Không thể lấy thông tin loại sản phẩm');
      }
    } catch (error) {
      console.error('Lỗi khi lấy thông tin loại sản phẩm:', error);
      alert('Không thể lấy thông tin loại sản phẩm. Vui lòng thử lại sau!');
    } finally {
      setIsLoading(false);
    }
  }

  const handleDeleteUnit = async (id: string): Promise<void> => {
    if (!window.confirm('Bạn có chắc muốn xóa loại sản phẩm này không?')) {
      return;
    }

    setIsLoading(true);
    try {
      await deleteCollectionById(id, ECollectionNames.CATEGORY);
      alert('Xóa loại sản phẩm  thành công!');
      await fetchCategory();
    } catch (error) {
      console.error('Lỗi khi xóa loại sản phẩm :', error);
      alert('Không thể xóa loại sản phẩm . Vui lòng thử lại sau!');
    } finally {
      setIsLoading(false);
    }
  }

  const handleSearch = (e: ChangeEvent<HTMLInputElement>): void => {
    setSearchTerm(e.target.value);
  }

  const filteredCategories = categories.filter(c =>
    (c._id?.toString() || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6 flex items-center justify-between bg-white p-4 rounded-xl shadow-sm">
        <h1 className="text-2xl font-bold flex items-center text-primary gap-2">
          <IconContainer iconLink={boxIcon} size={28} className="mr-3 text-primary" />
          Quản lý loại sản phẩm
        </h1>
        <div className="flex space-x-3">
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <IconContainer iconLink={userIcon} size={16} className="text-gray-400" />
            </div>
            <input
              type="text"
              className="py-2 pl-10 pr-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary transition-all"
              placeholder="Tìm kiếm..."
              value={searchTerm}
              onChange={handleSearch}
            />
          </div>
          <Button
            onClick={resetForm}
            className="bg-primary text-white hover:bg-primary-dark transition-colors flex items-center font-medium gap-2"
            type={EButtonType.INFO}
          >
            {/* <IconContainer iconLink={plusIcon} size={16} className="mr-2" /> */}
            Làm mới
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form thêm/sửa loại sản phẩm  */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 h-full">
            <div className="border-b pb-4 mb-4">
              <h2 className="text-xl font-semibold flex items-center text-gray-800 gap-2">
                {isEditing ? (
                  <>
                    <IconContainer iconLink={pencilIcon} size={20} className="mr-2 text-yellow-600" />
                    Cập nhật loại sản phẩm
                  </>
                ) : (
                  <>
                    <IconContainer iconLink={boxIcon} size={20} className="mr-2 text-primary" />
                    Thêm loại sản phẩm mới
                  </>
                )}
              </h2>
            </div>

            <div className="space-y-4">
              {/* {isEditing && (
                <div>
                  <label className="block mb-1 font-medium text-gray-700">Mã loại sản phẩm</label>
                  <TextInput
                    name="code"
                    isDisable={true}
                    value={category.code}
                    className="w-full bg-gray-100"
                  />
                </div>
              )} */}

              <div>
                <label className="block mb-1 font-medium text-gray-700">Tên loại sản phẩm  <span className="text-red-500">*</span></label>
                <TextInput
                  name="name"
                  value={category.name}
                  onInputChange={handleChangeCategory}
                  placeholder="Nhập loại sản phẩm"
                  className="w-full"
                />
              </div>

              <div>
                <label className='block mb-1 font-medium text-gray-700'>Nhập hệ số (%) <span className="text-red-500">*</span></label>
                <NumberInput
                  min={0}
                  max={100}
                  name="discount"
                  value={category.discount + ""}
                  onInputChange={handleChangeCategory}
                  placeholder='Nhập hệ số giảm giá'
                  className='w-full'
                />
              </div>

              <div className="pt-4 flex flex-col space-y-2">
                <Button
                  onClick={handleSaveCategory}
                  className="text-white w-full py-2 transition-colors flex items-center justify-center font-bold"
                  type={EButtonType.INFO}
                >
                  {/* <IconContainer iconLink={checkIcon} size={16} className="mr-1" /> */}
                  {isEditing ? 'Cập nhật' : 'Lưu loại sản phẩm'}
                </Button>
                {isEditing && (
                  <Button
                    onClick={resetForm}
                    className="text-white w-full py-2 transition-colors flex items-center justify-center font-bold"
                    type={EButtonType.ERROR}
                  >
                    Hủy
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Danh sách loại sản phẩm  */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 h-full">
            <div className="border-b pb-4 mb-4">
              <h2 className="text-xl font-semibold flex items-center text-gray-800 gap-2">
                <IconContainer iconLink={boxIcon} size={20} className="mr-2 text-primary" />
                Danh sách loại sản phẩm
                <span className="ml-2 text-sm font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                  {filteredCategories.length} loại sản phẩm
                </span>
              </h2>
            </div>

            {filteredCategories.length === 0 ? (
              <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg">
                <IconContainer iconLink={boxIcon} size={48} className="mx-auto mb-3 opacity-25" />
                {searchTerm ? (
                  <p>Không tìm thấy loại sản phẩm  phù hợp với từ khóa &apos;{searchTerm}&apos;</p>
                ) : (
                  <p>Chưa có loại sản phẩm  nào. Vui lòng thêm loại sản phẩm  mới.</p>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên loại sản phẩm </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hệ số giảm giá</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày tạo</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredCategories.map((c, index) => (
                      <tr key={index} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{c.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                            {c.discount}%
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(c.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                          <div className="flex justify-center space-x-2">
                            <Button
                              onClick={() => handleViewDetail(c._id)}
                              className="bg-blue-100 text-blue-700 hover:bg-blue-200 p-2 rounded-full transition-colors"
                              title="Xem chi tiết"
                            >
                              <IconContainer iconLink={infoIcon} size={16} />
                            </Button>
                            <Button
                              onClick={() => handleEditCategory(c._id)}
                              className="bg-yellow-100 text-yellow-700 hover:bg-yellow-200 p-2 rounded-full transition-colors"
                              title="Sửa"
                            >
                              <IconContainer iconLink={pencilIcon} size={16} />
                            </Button>
                            <Button
                              onClick={() => handleDeleteUnit(c._id)}
                              className="bg-red-100 text-red-700 hover:bg-red-200 p-2 rounded-full transition-colors"
                              title="Xóa"
                            >
                              <IconContainer iconLink={trashIcon} size={16} />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal xem chi tiết loại sản phẩm  */}
      {showDetailModal && selectedCategory && (
        <div className="modal fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="modal-content bg-white p-6 rounded-lg shadow-lg max-w-2xl w-full">
            <div className="flex items-center justify-between mb-4 border-b pb-3">
              <h3 className="text-xl font-semibold flex items-center text-primary w-full gap-3">
                <IconContainer iconLink={infoIcon} size={30} className="mr-3" />
                Chi tiết loại sản phẩm
              </h3>
              <Button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 p-2 rounded-full transition-colors w-min"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div className="bg-gray-50 p-4 rounded-lg hover:shadow-sm transition-shadow">
                <h4 className="font-medium text-gray-500 text-sm">Tên</h4>
                <p className="text-lg font-semibold text-gray-800">{selectedCategory.name}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg hover:shadow-sm transition-shadow">
                <h4 className="font-medium text-gray-500 text-sm">Hệ số giảm giá</h4>
                <p className="text-base text-gray-700">{selectedCategory.discount}</p>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <Button
                onClick={() => {
                  setShowDetailModal(false);
                  handleEditCategory(selectedCategory._id);
                }}
                className="text-white w-full py-2 transition-colors flex items-center justify-center font-bold hover:bg-green-400"
                type={EButtonType.INFO}
              >
                {/* <IconContainer iconLink={pencilIcon} size={16} className="mr-1" /> */}
                Chỉnh sửa
              </Button>
              <Button
                onClick={() => setShowDetailModal(false)}
                className="bg-gray-200 text-white hover:bg-gray-300 transition-colors font-bold" type={EButtonType.ERROR}
              >
                Đóng
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
