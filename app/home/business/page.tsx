/* eslint-disable @next/next/no-img-element */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import React, { useRef, useState, useCallback, ChangeEvent, ReactElement, useEffect } from 'react';
import ManagerPage, { ICollectionIdNotify } from '@/components/manager-page/manager-page';
import { IColumnProps } from '@/components/table/interfaces/column-props.interface';
import { ECollectionNames } from '@/enums/collection-names.enum';
import { IBusiness } from '@/interfaces/business.interface';
import { DEFAULT_BUSINESS } from '@/constants/business.constant';
import { Text, Button, IconContainer } from '@/components';
import Image from 'next/image';
import Tabs from '@/components/tabs/tabs';
import TabItem from '@/components/tabs/components/tab-item/tab-item';
import { compressImage } from '@/components/compressImage';
import { EStatusCode } from '@/enums/status-code.enum';
import { addCollection } from '@/services/api-service';
import useNotificationsHook from '@/hooks/notifications-hook';
import { ENotificationType } from '@/components/notify/notification/notification';
import { pencilIcon, trashIcon, infoIcon } from '@/public';
import { createDeleteTooltip, createMoreInfoTooltip } from '@/utils/create-tooltip';
import Link from 'next/link';

const DetailModal = ({ business, isOpen, onClose }: { business: IBusiness | null, isOpen: boolean, onClose: () => void }) => {
  if (!business || !isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl transform transition-all animate-fade-in-up">
        <div className="px-8 py-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Chi tiết nhà cung cấp</h2>
              <p className="text-gray-600 mt-1">Thông tin chi tiết về nhà cung cấp</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <svg className="w-6 h-6 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="px-8 py-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {business.logo && (
              <div className="col-span-2 flex justify-center">
                <div className="relative w-48 h-48 rounded-xl overflow-hidden border-2 border-gray-100 shadow-lg">
                  <Image
                    src={business.logo}
                    alt="Logo nhà cung cấp"
                    fill
                    className="object-contain p-2"
                  />
                </div>
              </div>
            )}

            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-500">Tên nhà cung cấp</h3>
                <p className="mt-1 text-lg font-medium text-gray-900">{business.name}</p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-500">Email</h3>
                <p className="mt-1 text-lg font-medium text-gray-900">{business.email || 'Chưa cập nhật'}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-500">Số điện thoại</h3>
                <p className="mt-1 text-lg font-medium text-gray-900">{business.phone || 'Chưa cập nhật'}</p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-500">Địa chỉ</h3>
                <p className="mt-1 text-lg font-medium text-gray-900">{business.address || 'Chưa cập nhật'}</p>
              </div>
            </div>

            <div className="col-span-2 grid grid-cols-2 gap-8">
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-500">Ngày tạo</h3>
                <p className="mt-1 text-lg font-medium text-gray-900">
                  {new Date(business.created_at).toLocaleDateString('vi-VN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-500">Cập nhật lần cuối</h3>
                <p className="mt-1 text-lg font-medium text-gray-900">
                  {new Date(business.updated_at).toLocaleDateString('vi-VN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="px-8 py-6 border-t border-gray-200 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-all duration-200 font-medium"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};

const DeleteConfirmModal = ({ isOpen, onClose, onConfirm }: { isOpen: boolean, onClose: () => void, onConfirm: () => void }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-xl shadow-2xl p-6 min-w-[320px] max-w-[90vw] mt-20 flex flex-col items-center animate-fade-in">
        <div className="flex flex-col items-center mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-red-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z" />
          </svg>
          <h3 className="text-xl font-bold text-gray-800 mb-2">Xác nhận xóa nhà cung cấp</h3>
          <p className="text-gray-600 text-center text-base mb-1">Bạn có chắc chắn muốn xóa nhà cung cấp này không?</p>
          <p className="text-gray-500 text-center text-sm">Hành động này không thể hoàn tác.</p>
        </div>
        <div className="flex justify-center gap-4 mt-2 w-full">
          <button
            className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold min-w-[100px] transition-colors"
            onClick={onClose}
          >
            Hủy
          </button>
          <button
            className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold min-w-[100px] shadow-lg transition-colors"
            onClick={onConfirm}
          >
            Xóa
          </button>
        </div>
      </div>
    </div>
  );
};

const EditModal = ({ business, isOpen, onClose, onSave }: { business: IBusiness, isOpen: boolean, onClose: () => void, onSave: (data: IBusiness) => void }) => {
  const [formData, setFormData] = useState<IBusiness>(business);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(business.logo || null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setFormData(business);
    setLogoPreview(business.logo || null);
    setErrors({});
  }, [business]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Tên nhà cung cấp không được để trống';
    }

    if (!formData.address.trim()) {
      newErrors.address = 'Địa chỉ không được để trống';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Email không hợp lệ';
    }

    if (formData.phone && !/^[0-9]{10,11}$/.test(formData.phone)) {
      newErrors.phone = 'Số điện thoại phải có 10-11 số';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (name === 'phone') {
      const phoneValue = value.replace(/\D/g, '').slice(0, 11);
      setFormData(prev => ({
        ...prev,
        [name]: phoneValue
      }));
      console.log('Giá trị số điện thoại:', phoneValue);
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }

    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleLogoChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      if (file.size > 300 * 1024) {
        setErrors(prev => ({
          ...prev,
          logo: 'Kích thước file không được vượt quá 300KB'
        }));
        return;
      }

      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        setErrors(prev => ({
          ...prev,
          logo: 'Chỉ chấp nhận file ảnh định dạng JPG, PNG hoặc GIF'
        }));
        return;
      }

      const compressedFile = await compressImage(file, 800, 800, 0.7);
      setLogoFile(compressedFile);
      setLogoPreview(URL.createObjectURL(compressedFile));

      setErrors(prev => ({
        ...prev,
        logo: ''
      }));
    } catch (error) {
      setErrors(prev => ({
        ...prev,
        logo: 'Có lỗi xảy ra khi xử lý ảnh'
      }));
    }
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);
      let logoUrl = formData.logo;

      if (logoFile) {
        const formData = new FormData();
        formData.append('file', logoFile);
        formData.append('folder', 'business');

        const response = await fetch('/api/upload-image', {
          method: 'POST',
          body: formData
        });

        if (!response.ok) {
          throw new Error('Không thể tải lên logo');
        }

        const data = await response.json();
        logoUrl = data.url;
      }

      const updatedBusiness = {
        ...formData,
        logo: logoUrl
      };

      await onSave(updatedBusiness);
      onClose();
    } catch (error) {
      setErrors(prev => ({
        ...prev,
        submit: 'Có lỗi xảy ra khi lưu thông tin'
      }));
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl shadow-xl">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-xl font-semibold text-gray-900">Chỉnh sửa nhà cung cấp</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Logo</label>
              <div className="flex items-center space-x-4">
                <div className="relative">
                  {logoPreview ? (
                    <div className="relative w-24 h-24 rounded-lg overflow-hidden border-2 border-gray-200">
                      <Image
                        src={logoPreview}
                        alt="Preview"
                        fill
                        className="object-contain"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setLogoFile(null);
                          setLogoPreview(null);
                        }}
                        className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-1 hover:bg-red-600 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <div className="w-24 h-24 border-2 border-gray-300 border-dashed rounded-lg flex items-center justify-center">
                      <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </div>
                  )}
                </div>
                <div>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleLogoChange}
                    className="hidden"
                    id="logo-upload"
                  />
                  <label
                    htmlFor="logo-upload"
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 cursor-pointer"
                  >
                    Chọn ảnh
                  </label>
                  {errors.logo && <p className="mt-1 text-sm text-red-600">{errors.logo}</p>}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 mt-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tên nhà cung cấp <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${errors.name ? 'border-red-300' : 'border-gray-300'
                    }`}
                  placeholder="Nhập tên nhà cung cấp"
                />
                {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Địa chỉ <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${errors.address ? 'border-red-300' : 'border-gray-300'
                    }`}
                  placeholder="Nhập địa chỉ"
                />
                {errors.address && <p className="mt-1 text-sm text-red-600">{errors.address}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email || ''}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${errors.email ? 'border-red-300' : 'border-gray-300'
                    }`}
                  placeholder="Nhập email"
                />
                {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Số điện thoại</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  pattern="[0-9]*"
                  inputMode="numeric"
                  maxLength={11}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500 ${errors.phone ? 'border-red-300' : 'border-gray-300'
                    }`}
                  placeholder="Nhập số điện thoại (10-11 số)"
                />
                {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className={`px-4 py-2 border border-transparent rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${loading ? 'opacity-50 cursor-not-allowed' : ''
              }`}
          >
            {loading ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>

        {errors.submit && (
          <div className="px-6 pb-4">
            <p className="text-sm text-red-600">{errors.submit}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default function BusinessPage() {
  const { createNotification, notificationElements } = useNotificationsHook();
  const [business, setBusiness] = useState<IBusiness>(DEFAULT_BUSINESS);
  const [isModalReadOnly, setIsModalReadOnly] = useState(false);
  const [isClickShowMore, setIsClickShowMore] = useState<ICollectionIdNotify>({ id: '', isClicked: false });
  const [reloadFlag, setReloadFlag] = useState(false);
  const [loading, setLoading] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<IBusiness | null>(null);
  const [isAddCollectionModalOpen, setIsAddCollectionModalOpen] = useState(false);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setBusiness(prev => ({
      ...prev,
      [name]: value || ''
    }));
  };

  const handleLogoChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      if (file.size > 300 * 1024) {
        createNotification({
          id: Date.now(),
          children: 'Kích thước file không được vượt quá 300KB',
          type: ENotificationType.WARNING,
          isAutoClose: true,
          title: 'Cảnh báo',
        });
        return;
      }

      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif'];
      if (!allowedTypes.includes(file.type)) {
        createNotification({
          id: Date.now(),
          children: 'Chỉ chấp nhận file ảnh định dạng JPG, PNG hoặc GIF',
          type: ENotificationType.WARNING,
          isAutoClose: true,
          title: 'Cảnh báo',
        });
        return;
      }

      const compressedFile = await compressImage(file, 800, 800, 0.7);
      setLogoFile(compressedFile);
      setLogoPreview(URL.createObjectURL(compressedFile));

      createNotification({
        id: Date.now(),
        children: 'Tải ảnh lên thành công',
        type: ENotificationType.SUCCESS,
        isAutoClose: true,
        title: 'Thành công',
      });
    } catch (error) {
      console.error('Lỗi khi xử lý ảnh:', error);
      createNotification({
        id: Date.now(),
        children: 'Có lỗi xảy ra khi xử lý ảnh',
        type: ENotificationType.ERROR,
        isAutoClose: true,
        title: 'Lỗi',
      });
    }
  };

  const uploadLogo = async (file: File): Promise<string> => {
    try {
      if (!file) {
        throw new Error('Không có file được chọn');
      }

      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', 'business');

      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Lỗi khi upload ảnh');
      }

      const data = await response.json();
      if (!data.url) {
        throw new Error('Không nhận được URL ảnh từ server');
      }

      createNotification({
        id: Date.now(),
        children: 'Upload ảnh thành công',
        type: ENotificationType.SUCCESS,
        isAutoClose: true,
        title: 'Thành công',
      });

      return data.url;
    } catch (error) {
      console.error('Lỗi trong quá trình upload:', error);
      createNotification({
        id: Date.now(),
        children: error instanceof Error ? error.message : 'Lỗi không xác định khi upload ảnh',
        type: ENotificationType.ERROR,
        isAutoClose: true,
        title: 'Lỗi',
      });
      throw error;
    }
  };

  const customHandleAddCollection = async (): Promise<void> => {
    try {
      setLoading(true);

      const trimmedName = business.name.trim();
      const trimmedAddress = business.address.trim();
      const trimmedEmail = business.email?.trim();
      const trimmedPhone = business.phone?.trim();

      if (!trimmedName || !trimmedAddress) {
        createNotification({
          id: Date.now(),
          children: 'Vui lòng nhập đầy đủ tên doanh nghiệp và địa chỉ!',
          type: ENotificationType.WARNING,
          isAutoClose: true,
          title: 'Thiếu thông tin',
        });
        return;
      }

      let logoUrl = '';
      let logoLinks: string[] = [];

      if (logoFile) {
        try {
          console.log('Bắt đầu upload ảnh...');
          logoUrl = await uploadLogo(logoFile);
          console.log('Upload ảnh thành công:', logoUrl);
          logoLinks = [logoUrl];
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Có lỗi không xác định khi upload ảnh';
          createNotification({
            id: Date.now(),
            children: `Lỗi upload ảnh: ${errorMessage}`,
            type: ENotificationType.ERROR,
            isAutoClose: true,
            title: 'Lỗi Upload',
          });
          setLoading(false);
          return;
        }
      }

      const businessData = {
        name: trimmedName,
        address: trimmedAddress,
        email: trimmedEmail || undefined,
        phone: trimmedPhone || undefined,
        logo: logoUrl || undefined,
        logo_links: logoLinks.length > 0 ? logoLinks : undefined
      };

      console.log('Dữ liệu gửi lên server:', businessData);

      const response = await addCollection(businessData, ECollectionNames.BUSINESS);

      if (response.status !== EStatusCode.CREATED && response.status !== EStatusCode.OK) {
        if (logoUrl) {
          try {
            await fetch('/api/upload-image', {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ url: logoUrl }),
            });
            console.log('Đã xóa ảnh sau khi lưu thất bại');
          } catch (deleteError) {
            console.error('Lỗi khi xóa ảnh:', deleteError);
          }
        }

        const result = await response.json();
        throw new Error(result.error?.details || 'Lỗi khi thêm doanh nghiệp');
      }

      console.log('Lưu doanh nghiệp thành công!');
      setBusiness(DEFAULT_BUSINESS);
      setLogoFile(null);
      setLogoPreview(null);
      setReloadFlag(prev => !prev);
      createNotification({
        id: Date.now(),
        children: `Lưu doanh nghiệp ${trimmedName} thành công!`,
        type: ENotificationType.SUCCESS,
        isAutoClose: true,
        title: 'Thành công',
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Có lỗi không xác định';
      console.error('Lỗi:', error);
      createNotification({
        id: Date.now(),
        children: `Lỗi: ${errorMessage}`,
        type: ENotificationType.ERROR,
        isAutoClose: true,
        title: 'Lỗi',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteClick = (id: string) => {
    setConfirmDeleteId(id);
  };

  const handleDeleteConfirm = async () => {
    if (!confirmDeleteId) return;

    try {
      setLoading(true);
      const response = await fetch(`/api/business/${confirmDeleteId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Không thể xóa nhà cung cấp ');
      }

      createNotification({
        id: Date.now(),
        children: 'Xóa nhà cung cấp thành công',
        type: ENotificationType.SUCCESS,
        isAutoClose: true,
        title: 'Thành công',
      });

      setReloadFlag(prev => !prev);
    } catch (error) {
      createNotification({
        id: Date.now(),
        children: 'Không thể xóa nhà cung cấp',
        type: ENotificationType.ERROR,
        isAutoClose: true,
        title: 'Lỗi',
      });
    } finally {
      setLoading(false);
      setConfirmDeleteId(null);
    }
  };

  const handleViewDetail = async (businessId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/business/${businessId}`);
      if (!response.ok) {
        throw new Error('Không thể tải thông tin nhà cung cấp');
      }
      const data = await response.json();
      setSelectedBusiness(data);
      setShowDetailModal(true);
    } catch (error) {
      createNotification({
        id: Date.now(),
        children: 'Không thể tải thông tin nhà cung cấp',
        type: ENotificationType.ERROR,
        isAutoClose: true,
        title: 'Lỗi',
      });
    } finally {
      setLoading(false);
    }
  };

  const columns: Array<IColumnProps<any>> = [
    {
      key: 'index',
      ref: useRef(null),
      title: '#',
      size: '1fr',
    },
    {
      key: 'name',
      ref: useRef(null),
      title: 'Tên doanh nghiệp',
      size: '4fr',
    },
    {
      key: 'email',
      ref: useRef(null),
      title: 'Email',
      size: '3fr',
    },
    {
      key: 'address',
      ref: useRef(null),
      title: 'Địa chỉ',
      size: '5fr',
      render: (item) => (
        <Text isEllipsis tooltip={typeof item.address === 'string' ? item.address : Object.values(item.address).join(' ')}>
          {typeof item.address === 'string' ? item.address : Object.values(item.address).join(' ')}
        </Text>
      ),
    },
    {
      key: 'created_at',
      ref: useRef(null),
      title: 'Ngày tạo',
      size: '3fr',
      render: (item) => (
        <Text>{new Date(item.created_at).toLocaleDateString('vi-VN')}</Text>
      ),
    },
    {
      key: 'logo',
      ref: useRef(null),
      title: 'Logo',
      size: '2fr',
      render: (item) =>
        item.logo ? (
          <Image src={item.logo} alt="logo" width={40} height={40} className="object-contain rounded border" />
        ) : <></>,
    },
    {
      key: 'actions',
      ref: useRef(null),
      title: 'Thao tác',
      size: '2fr',
      render: (item: IBusiness) => (
        <div className="flex items-center gap-3">
          <button
            onClick={() => handleViewDetail(item._id)}
            className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-full transition-all duration-200"
            title="Xem chi tiết"
          >
            <IconContainer
              tooltip="Xem chi tiết"
              iconLink={infoIcon}
              style={{ width: 20, height: 20 }}
            />
          </button>
          <button
            onClick={() => {
              setBusiness(item);
              setIsModalReadOnly(false);
              setIsAddCollectionModalOpen(true);
            }}
            className="p-2 text-green-600 hover:text-green-700 hover:bg-green-50 rounded-full transition-all duration-200"
            title="Chỉnh sửa"
          >
            <IconContainer
              tooltip="Chỉnh sửa"
              iconLink={pencilIcon}
              style={{ width: 20, height: 20 }}
            />
          </button>
          <button
            onClick={() => handleDeleteClick(item._id)}
            className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-full transition-all duration-200"
            title="Xóa"
          >
            <IconContainer
              tooltip="Xóa"
              iconLink={trashIcon}
              style={{ width: 20, height: 20 }}
            />
          </button>
        </div>
      )
    }
  ];

  return (
    <>
      <ManagerPage
        columns={columns}
        collectionName={ECollectionNames.BUSINESS}
        defaultCollection={DEFAULT_BUSINESS}
        collection={business}
        setCollection={setBusiness}
        isModalReadonly={isModalReadOnly}
        setIsModalReadonly={setIsModalReadOnly}
        isClickShowMore={isClickShowMore}
        setIsClickShowMore={setIsClickShowMore}
        isClickDelete={{ id: '', isClicked: false }}
        key={reloadFlag ? 'reload-1' : 'reload-0'}
        customHandleAddCollection={customHandleAddCollection}
      >
        <Tabs>
          <TabItem label="Thông tin doanh nghiệp">
            <div className="bg-white rounded-lg p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="flex items-center gap-2 text-lg font-medium text-gray-700 mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    Tên doanh nghiệp<span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={business.name}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    placeholder="Nhập tên doanh nghiệp"
                    required
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-lg font-medium text-gray-700 mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Địa chỉ<span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={business.address}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    placeholder="Nhập địa chỉ đầy đủ"
                    required
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-lg font-medium text-gray-700 mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    Email
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={business.email || ''}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    placeholder="Nhập địa chỉ email"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-lg font-medium text-gray-700 mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    Số điện thoại
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={business.phone || ''}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
                    placeholder="Nhập số điện thoại"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="flex items-center gap-2 text-lg font-medium text-gray-700 mb-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Logo
                  </label>

                  <div className="flex gap-4">
                    <div className="border border-dashed border-gray-300 rounded-lg w-32 h-32 flex flex-col items-center justify-center cursor-pointer hover:border-blue-500 transition-colors" onClick={() => document.getElementById('logo-input')?.click()}>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoChange}
                        className="hidden"
                        id="logo-input"
                      />
                      {!logoPreview && (
                        <>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                          </svg>
                          <span className="text-xs text-blue-500 text-center font-medium">Chọn ảnh<br />logo</span>
                        </>
                      )}
                    </div>

                    {logoPreview && (
                      <div className="relative w-32 h-32 border border-gray-300 rounded-lg overflow-hidden">
                        <img
                          src={logoPreview}
                          alt="Preview"
                          className="w-full h-full object-contain p-2"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setLogoFile(null);
                            setLogoPreview(null);
                          }}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center hover:bg-red-600 shadow-sm transition-colors"
                        >
                          ×
                        </button>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Hỗ trợ định dạng JPG, PNG, GIF. Kích thước tối đa 300KB.</p>
                </div>
              </div>
            </div>
          </TabItem>
        </Tabs>
      </ManagerPage>

      <DetailModal
        business={selectedBusiness}
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedBusiness(null);
        }}
      />

      <DeleteConfirmModal
        isOpen={!!confirmDeleteId}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={handleDeleteConfirm}
      />

      <EditModal
        business={business}
        isOpen={isAddCollectionModalOpen}
        onClose={() => {
          setIsAddCollectionModalOpen(false);
          setBusiness(DEFAULT_BUSINESS);
        }}
        onSave={async (updatedBusiness) => {
          try {
            const dataToSend = {
              name: updatedBusiness.name.trim(),
              address: updatedBusiness.address.trim(),
              email: updatedBusiness.email?.trim() || '',
              phone: updatedBusiness.phone || '',
              logo: updatedBusiness.logo || '',
              logo_links: updatedBusiness.logo ? [updatedBusiness.logo] : []
            };

            console.log('Dữ liệu gửi đi:', dataToSend);

            const response = await fetch(`/api/business/${updatedBusiness._id}`, {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json'
              },
              body: JSON.stringify(dataToSend)
            });

            if (!response.ok) {
              throw new Error('Không thể cập nhật thông tin nhà cung cấp');
            }

            const data = await response.json();
            console.log('Dữ liệu trả về từ server:', data);

            createNotification({
              id: Date.now(),
              children: 'Cập nhật thông tin nhà cung cấp thành công',
              type: ENotificationType.SUCCESS,
              isAutoClose: true,
              title: 'Thành công',
            });

            setReloadFlag(prev => !prev);
            setIsAddCollectionModalOpen(false);
            setBusiness(DEFAULT_BUSINESS);
          } catch (error) {
            console.error('Lỗi cập nhật:', error);
            createNotification({
              id: Date.now(),
              children: error instanceof Error ? error.message : 'Không thể cập nhật thông tin nhà cung cấp',
              type: ENotificationType.ERROR,
              isAutoClose: true,
              title: 'Lỗi',
            });
          }
        }}
      />

      {notificationElements}
    </>
  );
}
