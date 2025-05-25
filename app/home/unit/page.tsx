'use client';

import { Button, IconContainer, NumberInput, TextInput } from '@/components'
import React, { ChangeEvent, useEffect, useState } from 'react'
import { fetchGetCollections } from '@/utils/fetch-get-collections';
import { ECollectionNames } from '@/enums';
import { addCollection, deleteCollectionById, getCollectionById, updateCollectionById } from '@/services/api-service';
import { LoadingScreen } from '@/components';
import { boxIcon, infoIcon, pencilIcon, trashIcon, userIcon, plusIcon } from '@/public';
import { EButtonType } from '@/components/button/interfaces/button-type.interface';

// Định nghĩa giao diện cho đơn vị tính
interface IUnit {
  _id: string;
  name: string;
  equal: number;
  created_at: Date;
  updated_at: Date;
}

// Định nghĩa giá trị mặc định cho đơn vị tính
const DEFAULT_UNIT: IUnit = {
  _id: '',
  name: '',
  equal: 1,
  created_at: new Date(),
  updated_at: new Date(),
};

// Hàm tạo mã đơn vị tính theo định dạng DV-(NgayThangNam)-0001
const generateUnitId = (index: number): string => {
  const today = new Date();
  const day = String(today.getDate()).padStart(2, '0');
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const year = today.getFullYear();
  const dateStr = `${day}${month}${year}`;
  const sequenceNumber = String(index + 1).padStart(4, '0');
  return `DV-${dateStr}-${sequenceNumber}`;
};

export default function UnitPage() {
  const [unit, setUnit] = useState<IUnit>({ ...DEFAULT_UNIT, _id: generateUnitId(0) });
  const [units, setUnits] = useState<IUnit[]>([]);
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);
  const [selectedUnit, setSelectedUnit] = useState<IUnit | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Fetch dữ liệu từ API khi trang được load
  useEffect(() => {
    fetchUnits();
  }, []);

  // Hàm lấy dữ liệu từ API
  const fetchUnits = async () => {
    setIsLoading(true);
    try {
      const fetchedUnits = await fetchGetCollections<IUnit>(ECollectionNames.UNIT);
      setUnits(fetchedUnits);
    } catch (error) {
      console.error('Lỗi khi lấy dữ liệu đơn vị tính:', error);
      alert('Không thể lấy dữ liệu đơn vị tính. Vui lòng thử lại sau!');
    } finally {
      setIsLoading(false);
    }
  };

  const handleChangeUnit = (e: ChangeEvent<HTMLInputElement>): void => {
    setUnit({
      ...unit,
      [e.target.name]: e.target.name === 'equal' ? Number(e.target.value) : e.target.value,
    });
  }

  // Thêm hoặc cập nhật đơn vị tính
  const handleSaveUnit = async (): Promise<void> => {
    if (!unit.name.trim()) {
      alert('Vui lòng nhập tên đơn vị tính');
      return;
    }

    setIsLoading(true);
    try {
      if (isEditing) {
        // Cập nhật đơn vị tính đã có
        await updateCollectionById<IUnit>(unit, unit._id, ECollectionNames.UNIT);
        alert('Cập nhật đơn vị tính thành công!');
      } else {
        // Thêm đơn vị tính mới
        await addCollection<IUnit>(unit, ECollectionNames.UNIT);
        alert('Thêm đơn vị tính thành công!');
      }

      // Làm mới danh sách đơn vị tính
      await fetchUnits();

      // Reset form
      resetForm();
    } catch (error) {
      console.error('Lỗi khi lưu đơn vị tính:', error);
      alert('Không thể lưu đơn vị tính. Vui lòng thử lại sau!');
    } finally {
      setIsLoading(false);
    }
  }

  const resetForm = () => {
    setUnit({
      ...DEFAULT_UNIT,
      _id: generateUnitId(units.length + 1)
    });
    setIsEditing(false);
  }

  const handleEditUnit = async (id: string): Promise<void> => {
    setIsLoading(true);
    try {
      const response = await getCollectionById(id, ECollectionNames.UNIT);
      if (response.ok) {
        const unitData = await response.json();
        setUnit(unitData);
        setIsEditing(true);
      } else {
        throw new Error('Không thể lấy thông tin đơn vị tính');
      }
    } catch (error) {
      console.error('Lỗi khi lấy thông tin đơn vị tính:', error);
      alert('Không thể lấy thông tin đơn vị tính. Vui lòng thử lại sau!');
    } finally {
      setIsLoading(false);
    }
  }

  const handleViewDetail = async (id: string): Promise<void> => {
    setIsLoading(true);
    try {
      const response = await getCollectionById(id, ECollectionNames.UNIT);
      if (response.ok) {
        const unitData = await response.json();
        setSelectedUnit(unitData);
        setShowDetailModal(true);
      } else {
        throw new Error('Không thể lấy thông tin đơn vị tính');
      }
    } catch (error) {
      console.error('Lỗi khi lấy thông tin đơn vị tính:', error);
      alert('Không thể lấy thông tin đơn vị tính. Vui lòng thử lại sau!');
    } finally {
      setIsLoading(false);
    }
  }

  const handleDeleteUnit = async (id: string): Promise<void> => {
    if (!window.confirm('Bạn có chắc muốn xóa đơn vị tính này không?')) {
      return;
    }

    setIsLoading(true);
    try {
      await deleteCollectionById(id, ECollectionNames.UNIT);
      alert('Xóa đơn vị tính thành công!');
      await fetchUnits();
    } catch (error) {
      console.error('Lỗi khi xóa đơn vị tính:', error);
      alert('Không thể xóa đơn vị tính. Vui lòng thử lại sau!');
    } finally {
      setIsLoading(false);
    }
  }

  const handleSearch = (e: ChangeEvent<HTMLInputElement>): void => {
    setSearchTerm(e.target.value);
  }

  const filteredUnits = units.filter(u =>
    u._id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6 flex items-center justify-between bg-white p-4 rounded-xl shadow-sm">
        <h1 className="text-2xl font-bold flex items-center text-primary">
          <IconContainer iconLink={boxIcon} size={28} className="mr-3 text-primary" />
          Quản lý Đơn vị tính
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
            <IconContainer iconLink={plusIcon} size={16} className="mr-2" />
            Thêm mới
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form thêm/sửa đơn vị tính */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 h-full">
            <div className="border-b pb-4 mb-4">
              <h2 className="text-xl font-semibold flex items-center text-gray-800">
                {isEditing ? (
                  <>
                    <IconContainer iconLink={pencilIcon} size={20} className="mr-2 text-yellow-600" />
                    Cập nhật đơn vị tính
                  </>
                ) : (
                  <>
                    <IconContainer iconLink={boxIcon} size={20} className="mr-2 text-primary" />
                    Thêm đơn vị tính mới
                  </>
                )}
              </h2>
            </div>

            <div className="space-y-4">
              {isEditing && (
                <div>
                  <label className="block mb-1 font-medium text-gray-700">Mã đơn vị</label>
                  <TextInput
                    name="_id"
                    isDisable={true}
                    value={unit._id}
                    className="w-full bg-gray-100"
                  />
                </div>
              )}

              <div>
                <label className="block mb-1 font-medium text-gray-700">Tên đơn vị tính <span className="text-red-500">*</span></label>
                <TextInput
                  name="name"
                  value={unit.name}
                  onInputChange={handleChangeUnit}
                  placeholder="Nhập tên đơn vị tính"
                  className="w-full"
                />
              </div>

              <div>
                <label className="block mb-1 font-medium text-gray-700">Số lượng quy đổi <span className="text-red-500">*</span></label>
                <NumberInput
                  min={1}
                  max={1000}
                  name="equal"
                  value={unit.equal + ""}
                  onInputChange={handleChangeUnit}
                  placeholder="Nhập số lượng quy đổi"
                  className="w-full"
                />
              </div>

              <div className="pt-4 flex flex-col space-y-2">
                <Button
                  onClick={handleSaveUnit}
                  className="text-white w-full py-2 transition-colors flex items-center justify-center font-bold"
                  type={EButtonType.INFO}
                >
                  {/* <IconContainer iconLink={checkIcon} size={16} className="mr-1" /> */}
                  {isEditing ? 'Cập nhật' : 'Lưu đơn vị tính'}
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

        {/* Danh sách đơn vị tính */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 h-full">
            <div className="border-b pb-4 mb-4">
              <h2 className="text-xl font-semibold flex items-center text-gray-800">
                <IconContainer iconLink={boxIcon} size={20} className="mr-2 text-primary" />
                Danh sách đơn vị tính
                <span className="ml-2 text-sm font-normal text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                  {filteredUnits.length} đơn vị
                </span>
              </h2>
            </div>

            {filteredUnits.length === 0 ? (
              <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg">
                <IconContainer iconLink={boxIcon} size={48} className="mx-auto mb-3 opacity-25" />
                {searchTerm ? (
                  <p>Không tìm thấy đơn vị tính phù hợp với từ khóa &apos;{searchTerm}&apos;</p>
                ) : (
                  <p>Chưa có đơn vị tính nào. Vui lòng thêm đơn vị tính mới.</p>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-gray-200">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {/* <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã</th> */}
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên đơn vị tính</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Số lượng quy đổi</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày tạo</th>
                      <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredUnits.map((u, index) => (
                      <tr key={index} className="hover:bg-gray-50 transition-colors">
                        {/* <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{u.code}</td> */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">{u.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                          <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                            {u.equal}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(u.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                          <div className="flex justify-center space-x-2">
                            <Button
                              onClick={() => handleViewDetail(u._id)}
                              className="bg-blue-100 text-blue-700 hover:bg-blue-200 p-2 rounded-full transition-colors"
                              title="Xem chi tiết"
                            >
                              <IconContainer iconLink={infoIcon} size={16} />
                            </Button>
                            <Button
                              onClick={() => handleEditUnit(u._id)}
                              className="bg-yellow-100 text-yellow-700 hover:bg-yellow-200 p-2 rounded-full transition-colors"
                              title="Sửa"
                            >
                              <IconContainer iconLink={pencilIcon} size={16} />
                            </Button>
                            <Button
                              onClick={() => handleDeleteUnit(u._id)}
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

      {/* Modal xem chi tiết đơn vị tính */}
      {showDetailModal && selectedUnit && (
        <div className="modal fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="modal-content bg-white p-6 rounded-lg shadow-lg max-w-2xl w-full">
            <div className="flex items-center justify-between mb-4 border-b pb-3">
              <h3 className="text-xl font-semibold flex items-center text-primary">
                <IconContainer iconLink={infoIcon} size={20} className="mr-2" />
                Chi tiết đơn vị tính
              </h3>
              <Button
                onClick={() => setShowDetailModal(false)}
                className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 p-2 rounded-full transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              {/* <div className="bg-gray-50 p-4 rounded-lg hover:shadow-sm transition-shadow">
                <h4 className="font-medium text-gray-500 text-sm">Mã đơn vị tính</h4>
                <p className="text-lg font-semibold text-gray-800">{selectedUnit._id}</p>
              </div> */}
              <div className="bg-gray-50 p-4 rounded-lg hover:shadow-sm transition-shadow">
                <h4 className="font-medium text-gray-500 text-sm">Tên đơn vị tính</h4>
                <p className="text-lg font-semibold text-gray-800">{selectedUnit.name}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg hover:shadow-sm transition-shadow">
                <h4 className="font-medium text-gray-500 text-sm">Số lượng quy đổi</h4>
                <p className="text-lg">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                    {selectedUnit.equal}
                  </span>
                </p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg hover:shadow-sm transition-shadow">
                <h4 className="font-medium text-gray-500 text-sm">Ngày tạo</h4>
                <p className="text-base text-gray-700">{new Date(selectedUnit.created_at).toLocaleString()}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg hover:shadow-sm transition-shadow">
                <h4 className="font-medium text-gray-500 text-sm">Ngày cập nhật</h4>
                <p className="text-base text-gray-700">{new Date(selectedUnit.updated_at).toLocaleString()}</p>
              </div>
            </div>

            <div className="flex justify-end mt-6">
              <Button
                onClick={() => {
                  setShowDetailModal(false);
                  handleEditUnit(selectedUnit._id);
                }}
                className="bg-blue-600 text-white hover:bg-blue-700 mr-2 transition-colors flex items-center"
              >
                <IconContainer iconLink={pencilIcon} size={16} className="mr-1" />
                Chỉnh sửa
              </Button>
              <Button
                onClick={() => setShowDetailModal(false)}
                className="bg-gray-200 text-gray-800 hover:bg-gray-300 transition-colors"
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
