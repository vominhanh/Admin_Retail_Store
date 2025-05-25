/* eslint-disable @next/next/no-img-element */
/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import { Button, IconContainer, SelectDropdown, Text, TextInput } from '@/components'
import ManagerPage, { ICollectionIdNotify } from '@/components/manager-page/manager-page'
import { IColumnProps } from '@/components/table/interfaces/column-props.interface'
import { ECollectionNames } from '@/enums'
import React, { ChangeEvent, ReactElement, useCallback, useEffect, useRef, useState } from 'react'
import InputSection from '../components/input-section/input-section';
import { pencilIcon, trashIcon } from '@/public';
import { createDeleteTooltip, createMoreInfoTooltip } from '@/utils/create-tooltip';
import TabItem from '@/components/tabs/components/tab-item/tab-item';
import Tabs from '@/components/tabs/tabs';
import Image from 'next/image';
import styles from './style.module.css';
import { ISelectOption } from '@/components/select-dropdown/interfaces/select-option.interface';
import { fetchGetCollections } from '@/utils/fetch-get-collections';
import { getSelectedOptionIndex } from '@/components/select-dropdown/utils/get-selected-option-index';
import { IBusiness } from '@/interfaces/business.interface';
import { translateCollectionName } from '@/utils/translate-collection-name';
import { formatCurrency } from '@/utils/format-currency';
import useNotificationsHook from '@/hooks/notifications-hook';
import { ICategory } from '@/interfaces/category.interface';
import { IProduct } from '@/interfaces/product.interface';
import { DEFAULT_PROCDUCT } from '@/constants/product.constant';
import { createCollectionDetailLink } from '@/utils/create-collection-detail-link';
import { IUnit } from '@/interfaces/unit.interface';
import { EStatusCode } from '@/enums/status-code.enum';
import { addCollection, updateCollectionById } from '@/services/api-service';
import { ENotificationType } from '@/components/notify/notification/notification';
import { compressImage } from '@/components/compressImage';

type collectionType = IProduct;
const collectionName: ECollectionNames = ECollectionNames.PRODUCT;

export default function Product() {
  const { createNotification, notificationElements } = useNotificationsHook();
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [product, setProduct] = useState<collectionType>(DEFAULT_PROCDUCT);
  const [isModalReadOnly, setIsModalReadOnly] = useState<boolean>(false);
  const [isClickShowMore, setIsClickShowMore] = useState<ICollectionIdNotify>({
    id: ``,
    isClicked: false
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [supplierOptions, setSupplierOptions] = useState<ISelectOption[]>([]);
  const [categoryOptions, setCategoryOptions] = useState<ISelectOption[]>([]);
  const [supplier, setSupplier] = useState<IBusiness[]>([]);
  const [categories, setCategories] = useState<ICategory[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [products, setProducts] = useState<collectionType[]>([]);
  const [units, setUnits] = useState<IUnit[]>([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Dùng ref để đảm bảo chỉ gọi API khi cần thiết
  const dataFetched = useRef(false);
  const productAdded = useRef(false);

  // Hàm fetch data chỉ chạy 1 lần khi component mount
  useEffect(() => {
    // Nếu đã fetch data rồi thì không fetch nữa
    if (dataFetched.current) return;

    const fetchAllData = async () => {
      setIsLoading(true);
      try {
        console.log("Đang tải dữ liệu ban đầu...");

        // Fetch tất cả dữ liệu cần thiết
        const [newBusinesses, newCategories, newUnits, fetchedProducts] = await Promise.all([
          fetchGetCollections<IBusiness>(ECollectionNames.BUSINESS),
          fetchGetCollections<ICategory>(ECollectionNames.CATEGORY),
          fetchGetCollections<IUnit>(ECollectionNames.UNIT),
          fetchGetCollections<IProduct>(ECollectionNames.PRODUCT)
        ]);

        // Xử lý suppliers
        const newSuppliers = newBusinesses

        // Chỉ set supplier_id nếu chưa có
        if (newSuppliers.length > 0) {
          setProduct(prev => ({
            ...prev,
            supplier_id: prev.supplier_id || newSuppliers[0]._id,
          }));
        }

        setSupplierOptions(
          newSuppliers.map((supplier: IBusiness): ISelectOption => ({
            label: `${supplier.name}`,
            value: supplier._id,
          }))
        );

        // Xử lý categories
        setCategories(newCategories);

        // Chỉ set category_id nếu chưa có
        if (newCategories.length > 0) {
          setProduct(prev => ({
            ...prev,
            category_id: prev.category_id || newCategories[0]._id,
          }));
        }

        setCategoryOptions(
          newCategories.map((category: ICategory): ISelectOption => ({
            label: `${category.name}`,
            value: category._id,
          }))
        );

        // Xử lý units
        setUnits(newUnits);

        // Xử lý products
        // Sắp xếp sản phẩm theo thời gian tạo mới nhất
        fetchedProducts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

        const newProducts = fetchedProducts.map((product) => {
          const newProduct = { ...product } as any;
          const foundCategory = newCategories.find((category) => category._id === product.category_id);
          newProduct.category = foundCategory?.name;

          const foundSupplier = newSuppliers.find((supplier2) => supplier2._id === product.supplier_id);
          newProduct.supplier = foundSupplier?.name;
          return newProduct;
        });

        setProducts(newProducts);

        // Đánh dấu đã tải dữ liệu
        dataFetched.current = true;
        console.log("Đã tải dữ liệu xong!");
      } catch (error) {
        console.error('Lỗi khi lấy dữ liệu:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAllData();
  }, []); // Chỉ chạy 1 lần khi component mount

  // Tách riêng useEffect cho việc tải lại dữ liệu khi thêm sản phẩm thành công
  useEffect(() => {
    // Nếu đã thêm sản phẩm thành công thì tải lại dữ liệu
    if (productAdded.current) {
      const reloadProducts = async () => {
        setIsLoading(true);
        try {
          console.log("Đang tải lại danh sách sản phẩm...");

          // Chỉ cần tải lại sản phẩm, không cần tải lại các dữ liệu khác
          const fetchedProducts = await fetchGetCollections<IProduct>(ECollectionNames.PRODUCT);

          // Sắp xếp sản phẩm theo thời gian tạo mới nhất
          fetchedProducts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

          const newProducts = fetchedProducts.map((product) => {
            const newProduct = { ...product } as any;
            const foundCategory = categories.find((category) => category._id === product.category_id);
            newProduct.category = foundCategory?.name;

            const foundSupplier = supplier.find((supplier2) => supplier2._id === product.supplier_id);
            newProduct.supplier = foundSupplier?.name;
            return newProduct;
          });

          setProducts(newProducts);

          // Đặt lại trạng thái
          productAdded.current = false;
          console.log("Đã tải lại danh sách sản phẩm xong!");
        } catch (error) {
          console.error('Lỗi khi tải lại danh sách sản phẩm:', error);
        } finally {
          setIsLoading(false);
        }
      };

      reloadProducts();
    }
  }, [categories, supplier]);

  const columns: Array<IColumnProps<collectionType>> = [
    {
      key: `index`,
      ref: useRef(null),
      title: `#`,
      size: `1fr`,
    },
    {
      key: `code`,
      ref: useRef(null),
      title: `Mã`,
      size: `4fr`,
    },
    {
      key: `image_links`,
      ref: useRef(null),
      title: `Hình ảnh`,
      size: `3fr`,
      render: (collection: collectionType): ReactElement =>
        <div className="flex items-center justify-center min-h-[60px]">
          {
            collection.image_links?.map((image: string, index: number) =>
              image ? (
                <div
                  key={index}
                  className={`relative ${styles[`image-container`]}`}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60px' }}
                >
                  <Image
                    className="object-contain max-h-[56px] max-w-[56px]"
                    src={getCloudinaryUrl(image)}
                    alt={``}
                    width={56}
                    height={56}
                    quality={10}
                  />
                </div>
              ) : null
            ) || []
          }
        </div>
    },
    {
      key: `supplier`,
      ref: useRef(null),
      title: `Nhà cung cấp`,
      size: `4fr`,
      render: (collection: collectionType): ReactElement => (
        <p>{collection.supplier || ''}</p>
      )
    },
    {
      key: `name`,
      ref: useRef(null),
      title: `Tên sản phẩm`,
      size: `4fr`,
    },
    {
      key: `name`,
      ref: useRef(null),
      title: `Loại sản phẩm`,
      size: `4fr`,
      render: (collection: collectionType): ReactElement => {
        const foundCategories = categories.find((element) => {
          return element._id === collection.category_id
        })
        return <p>{foundCategories?.name}</p>

      }
    },
    {
      key: `description`,
      ref: useRef(null),
      title: `Mô tả`,
      size: `5fr`,
    },
    {
      key: `input_price`,
      ref: useRef(null),
      title: `Giá nhập`,
      size: `3fr`,
      render: (collection: collectionType): ReactElement =>
        <Text>{formatCurrency(collection.input_price)}</Text>
    },
    {
      key: `output_price`,
      ref: useRef(null),
      title: `Giá bán`,
      size: `3fr`,
      render: (collection: collectionType): ReactElement =>
        <Text>{formatCurrency(collection.output_price)}</Text>
    },

    {
      key: `created_at`,
      ref: useRef(null),
      title: `Ngày tạo`,
      size: `4fr`,
      render: (collection: collectionType): ReactElement => {
        const date: string = new Date(collection.created_at).toLocaleDateString();
        return <Text isEllipsis={true} tooltip={date}>{date}</Text>
      }
    },
    {
      title: `Thao tác`,
      ref: useRef(null),
      size: `4fr`,
      render: (collection: collectionType): ReactElement => (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 12, minHeight: 48 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6', borderRadius: 8, padding: 6, transition: 'background 0.2s', cursor: 'pointer' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#e0e7ef')}
            onMouseLeave={e => (e.currentTarget.style.background = '#f3f4f6')}
          >
            <Button
              title={createMoreInfoTooltip(collectionName)}
              onClick={(): void => {
                setIsClickShowMore({
                  id: collection._id,
                  isClicked: !isClickShowMore.isClicked,
                });
              }}
              style={{
                background: 'transparent',
                border: 'none',
                padding: 0,
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'none',
                cursor: 'pointer',
              }}
            >
              <IconContainer
                tooltip={createMoreInfoTooltip(collectionName)}
                iconLink={pencilIcon}
                style={{ width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              />
            </Button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6', borderRadius: 8, padding: 6, transition: 'background 0.2s', cursor: 'pointer' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#f3f4f6')}
            onMouseLeave={e => (e.currentTarget.style.background = '#f3f4f6')}
          >
            {createCollectionDetailLink(collectionName, collection._id)}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f3f4f6', borderRadius: 8, padding: 6, transition: 'background 0.2s', cursor: 'pointer' }}
            onMouseEnter={e => (e.currentTarget.style.background = '#fde8e8')}
            onMouseLeave={e => (e.currentTarget.style.background = '#f3f4f6')}
          >
            <Button
              title={createDeleteTooltip(collectionName)}
              onClick={(): void => {
                handleProductDelete(collection._id);
              }}
              style={{
                background: 'transparent',
                border: 'none',
                padding: 0,
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: 'none',
                cursor: 'pointer',
              }}
            >
              <IconContainer
                tooltip={createDeleteTooltip(collectionName)}
                iconLink={trashIcon}
                style={{ width: 22, height: 22, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              />
            </Button>
          </div>
        </div>
      )
    },
  ];

  const handleChangeBusinessId = (e: ChangeEvent<HTMLSelectElement>): void => {
    setProduct({
      ...product,
      supplier_id: e.target.value,
    });
  }
  const handleChangeCategoryId = (e: ChangeEvent<HTMLSelectElement>): void => {
    const categoryId = e.target.value;
    setProduct({
      ...product,
      category_id: categoryId,
    });
  }

  const gridColumns: string = `200px 1fr`;

  const handleOpenModal = (prev: boolean): boolean => {
    return !prev;
  }

  function handleChangeProduct(e: ChangeEvent<HTMLInputElement>): void {
    const { name, value } = e.target;
    setProduct(prevProduct => ({
      ...prevProduct,
      [name]: value,
    }));
  }

  // Custom handle add collection
  const customHandleAddCollection = async (): Promise<void> => {
    try {
      // 1. Lưu sản phẩm trước, chưa có image_links
      const productToSave = { ...product, image_links: [] };
      const response = await addCollection<IProduct>(productToSave, collectionName);
      if (response.status === EStatusCode.CREATED || response.status === EStatusCode.OK) {
        // Lấy id sản phẩm vừa tạo
        const savedProduct = await response.json();
        const productId = savedProduct._id;
        // 2. Nếu có ảnh, upload lên cloudinary
        let imageLinks: string[] = [];
        if (imageFiles.length > 0) {
          for (const file of imageFiles) {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('folder', 'product');
            const res = await fetch('/api/upload-image', {
              method: 'POST',
              body: formData,
            });
            const data = await res.json();
            if (data.url) imageLinks.push(data.url);
          }
          // 3. Cập nhật lại sản phẩm với image_links
          const updateRes = await updateCollectionById<IProduct>({ ...savedProduct, image_links: imageLinks }, productId, collectionName);
          if (updateRes.status === EStatusCode.CREATED || updateRes.status === EStatusCode.OK) {
            createNotification({
              id: Date.now(),
              children: `Lưu sản phẩm ${product.name} thành công!`,
              type: ENotificationType.SUCCESS,
              isAutoClose: true,
              title: 'Thành công',
            });
          } else {
            createNotification({
              id: Date.now(),
              children: 'Lưu sản phẩm thành công nhưng cập nhật ảnh thất bại!',
              type: ENotificationType.WARNING,
              isAutoClose: true,
              title: 'Cảnh báo',
            });
          }
        } else {
          // Không có ảnh, chỉ thông báo thành công
          createNotification({
            id: Date.now(),
            children: `Lưu sản phẩm ${product.name} thành công!`,
            type: ENotificationType.SUCCESS,
            isAutoClose: true,
            title: 'Thành công',
          });
        }
        // Reset form
        setProduct(DEFAULT_PROCDUCT);
        setImageFiles([]);
        setImagePreviews([]);
        // Reload danh sách sản phẩm
        const fetchedProducts = await fetchGetCollections<IProduct>(ECollectionNames.PRODUCT);
        fetchedProducts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        const newProducts = fetchedProducts.map((product) => {
          const newProduct = { ...product } as any;
          const foundCategory = categories.find((category) => category._id === product.category_id);
          newProduct.category = foundCategory?.name;
          const foundSupplier = supplier.find((supplier2) => supplier2._id === product.supplier_id);
          newProduct.supplier = foundSupplier?.name;
          return newProduct;
        });
        setProducts(newProducts);
      } else {
        // Hiển thị thông báo lỗi
        let errorMessage = 'Lưu sản phẩm thất bại!';
        try {
          const errorData = await response.json();
          if (errorData && errorData.message) {
            errorMessage += ' ' + errorData.message;
          }
        } catch { }
        createNotification({
          id: Date.now(),
          children: errorMessage,
          type: ENotificationType.ERROR,
          isAutoClose: true,
          title: 'Lỗi',
        });
      }
    } catch (error) {
      console.error('Lỗi khi thêm sản phẩm:', error);
      createNotification({
        id: Date.now(),
        children: `Lỗi khi lưu sản phẩm: ${error instanceof Error ? error.message : 'Lỗi không xác định'}`,
        type: ENotificationType.ERROR,
        isAutoClose: true,
        title: 'Lỗi',
      });
    }
  };

  // Hàm xóa ảnh khỏi preview hoặc Cloudinary (nếu đã upload)
  const handleDeleteImage = async (index: number): Promise<void> => {
    const newImageFiles: File[] = imageFiles.filter((_imageFile: File, imageFileIndex: number) => imageFileIndex !== index);
    const newImagePreviews: string[] = imagePreviews.filter((_url: string, imageIndex: number) => imageIndex !== index);
    setImageFiles([...newImageFiles]);
    setImagePreviews([...newImagePreviews]);
  };

  // Hàm thêm transformation vào link Cloudinary
  function getCloudinaryUrl(url: string, options = { width: 800, quality: 70 }) {
    if (!url.includes('/upload/')) return url;
    const { width, quality } = options;
    return url.replace(
      '/upload/',
      `/upload/w_${width},q_${quality},f_auto/`
    );
  }

  // Sửa hàm cập nhật sản phẩm (giả sử có hàm handleUpdateProduct)
  async function handleUpdateProduct(updatedProduct: IProduct, newImageFiles: File[]): Promise<void> {
    // 1. Nếu có ảnh mới, upload lên Cloudinary
    let imageLinks: string[] = [];
    if (newImageFiles && newImageFiles.length > 0) {
      // Upload ảnh mới
      for (const file of newImageFiles) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('folder', 'product');
        const res = await fetch('/api/upload-image', {
          method: 'POST',
          body: formData,
        });
        const data = await res.json();
        if (data.url) imageLinks.push(data.url);
      }
    } else {
      imageLinks = updatedProduct.image_links || [];
    }
    // 2. Cập nhật lại sản phẩm với image_links mới
    await updateCollectionById<IProduct>({ ...updatedProduct, image_links: imageLinks }, updatedProduct._id, collectionName);
  }

  // Thêm lại hàm handleChangeImage nếu đã bị xóa nhầm
  const handleChangeImage = async (e: ChangeEvent<HTMLInputElement>) => {
    const { files } = e.target;
    if (!files) return;
    const fileArr = Array.from(files);
    // Nén ảnh trước khi lưu vào state
    const compressedFiles = await Promise.all(
      fileArr.map(file => compressImage(file, 800, 800, 0.7))
    );
    setImageFiles(compressedFiles);
    // Tạo url preview cho từng file đã nén
    const previews = compressedFiles.map(file => URL.createObjectURL(file));
    setImagePreviews(previews);
  };

  const handleProductDelete = useCallback((productId: string) => {
    const productToDelete = products.find(product => product._id === productId);
    if (!productToDelete) return;
    if ((productToDelete.input_price && productToDelete.input_price > 0) || (productToDelete.output_price && productToDelete.output_price > 0)) {
      createNotification({
        id: Date.now(),
        children: 'Không thể xóa sản phẩm vì sản phẩm đã được tạo trong một lô hàng!',
        type: ENotificationType.ERROR,
        isAutoClose: true,
        title: 'Lỗi',
      });
    } else {
      setConfirmDeleteId(productId);
    }
  }, [products, createNotification]);

  const confirmDeleteProduct = async () => {
    if (!confirmDeleteId) return;
    try {
      const res = await fetch(`/api/product/${confirmDeleteId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Lỗi không xác định');
      }
      setProducts(prev => prev.filter(product => product._id !== confirmDeleteId));
      createNotification({
        id: Date.now(),
        children: 'Đã xóa sản phẩm thành công!',
        type: ENotificationType.SUCCESS,
        isAutoClose: true,
        title: 'Thành công',
      });
    } catch (error: any) {
      createNotification({
        id: Date.now(),
        children: `Lỗi khi xóa sản phẩm: ${error.message}`,
        type: ENotificationType.ERROR,
        isAutoClose: true,
        title: 'Lỗi',
      });
    } finally {
      setConfirmDeleteId(null);
    }
  };

  // Sử dụng useCallback để wrap hàm onExitModalForm
  const handleExitModalForm = useCallback(() => {
    setImageFiles([]);
    setImagePreviews([]);
    setIsModalReadOnly(false);
  }, []); // Không có dependencies vì các hàm setState không thay đổi

  return (
    <>
      <ManagerPage
        columns={columns}
        collectionName={collectionName}
        defaultCollection={DEFAULT_PROCDUCT}
        collection={product}
        setCollection={setProduct}
        isModalReadonly={isModalReadOnly}
        setIsModalReadonly={setIsModalReadOnly}
        isClickShowMore={isClickShowMore}
        setIsClickShowMore={setIsClickShowMore}
        isClickDelete={{ id: '', isClicked: false }}
        isLoaded={isLoading}
        handleOpenModal={handleOpenModal}
        displayedItems={products}
        currentPage={currentPage}
        setCurrentPage={setCurrentPage}
        totalItems={products.length}
        customHandleAddCollection={customHandleAddCollection}
        onExitModalForm={handleExitModalForm}
      >
        <>
          <Tabs>
            <TabItem label={`${translateCollectionName(collectionName)}`}>
              <div className="bg-white rounded-xl shadow p-8 overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {/* Cột trái: Tên sản phẩm, Nhà cung cấp, Loại sản phẩm */}
                  <div className="flex flex-col gap-6">
                    {/* Tên sản phẩm */}
                    <div>
                      <label className="block text-gray-700 font-medium mb-2 items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        Tên sản phẩm <span className="text-red-500">*</span>
                      </label>
                      <input
                        name="name"
                        disabled={isModalReadOnly}
                        value={product.name}
                        onChange={handleChangeProduct}
                        className="w-full border-2 border-gray-200 focus:border-blue-500 rounded-lg py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all"
                        placeholder="Nhập tên sản phẩm"
                      />
                    </div>
                    {/* Nhà cung cấp */}
                    <div>
                      <label className="block text-gray-700 font-medium mb-2 items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        Nhà cung cấp <span className="text-red-500">*</span>
                      </label>
                      <SelectDropdown
                        name={`business_id`}
                        isLoading={isLoading}
                        isDisable={isModalReadOnly}
                        options={supplierOptions}
                        defaultOptionIndex={getSelectedOptionIndex(
                          supplierOptions, product.supplier_id
                        )}
                        onInputChange={handleChangeBusinessId}
                        className="w-full border-2 border-gray-200 focus:border-blue-500 rounded-lg py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all"
                      />
                    </div>
                    {/* Loại sản phẩm */}
                    <div>
                      <label className="block text-gray-700 font-medium mb-2 items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                        </svg>
                        Loại sản phẩm <span className="text-red-500">*</span>
                      </label>
                      <SelectDropdown
                        name={`category_id`}
                        isLoading={isLoading}
                        isDisable={isModalReadOnly}
                        options={categoryOptions}
                        defaultOptionIndex={getSelectedOptionIndex(
                          categoryOptions, product.category_id
                        )}
                        onInputChange={handleChangeCategoryId}
                        className="w-full border-2 border-gray-200 focus:border-blue-500 rounded-lg py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all"
                      />
                    </div>
                  </div>
                  {/* Cột phải: Mô tả và Hình ảnh sản phẩm */}
                  <div className="flex flex-col gap-6">
                    {/* Mô tả */}
                    <div>
                      <label className="block text-gray-700 font-medium mb-2 items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Mô tả
                      </label>
                      <textarea
                        name="description"
                        disabled={isModalReadOnly}
                        value={product.description}
                        onChange={(e) => setProduct(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full border-2 border-gray-200 focus:border-blue-500 rounded-lg py-3 px-4 text-gray-700 leading-tight focus:outline-none focus:ring-2 focus:ring-blue-200 transition-all"
                        placeholder="Nhập mô tả sản phẩm"
                        rows={3}
                      ></textarea>
                    </div>
                    {/* Hình ảnh sản phẩm */}
                    <div>
                      <label className="block text-gray-700 font-medium mb-2 items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        Hình ảnh sản phẩm
                      </label>

                      <div className="flex flex-wrap gap-3 items-center">
                        {/* Nút chọn ảnh */}
                        {!isModalReadOnly && (
                          <div className="border border-dashed border-blue-200 rounded-lg p-2 bg-white hover:bg-blue-50 transition-all" style={{ width: 120, height: 120 }}>
                            <label className="flex flex-col items-center justify-center h-full w-full cursor-pointer">
                              <svg className="w-8 h-8 text-blue-500 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                              </svg>
                              <span className="text-xs text-blue-600 text-center font-medium">Chọn ảnh sản phẩm</span>
                              <input
                                type="file"
                                className="hidden"
                                accept="image/*"
                                multiple={true}
                                onChange={handleChangeImage}
                                disabled={isModalReadOnly}
                              />
                            </label>
                          </div>
                        )}

                        {/* Ảnh đã chọn */}
                        {imagePreviews && imagePreviews.map((url, index) => (
                          <div
                            key={index}
                            className="relative border border-gray-200 rounded-lg overflow-hidden shadow-sm bg-white flex items-center justify-center"
                            style={{ width: 120, height: 120 }}
                          >
                            <img
                              src={url.startsWith('http') ? getCloudinaryUrl(url) : url}
                              alt={`Preview ${index + 1}`}
                              className="max-w-full max-h-full object-contain p-1"
                            />
                            {!isModalReadOnly && (
                              <button
                                className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center opacity-80 hover:opacity-100 transition-opacity"
                                onClick={() => handleDeleteImage(index)}
                                title="Xóa ảnh"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </TabItem>
          </Tabs>
          {notificationElements}
        </>
      </ManagerPage>
      {/* Modal xác nhận xóa sản phẩm - Đặt ngoài ManagerPage */}
      {confirmDeleteId && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-xl shadow-2xl p-6 min-w-[320px] max-w-[90vw] mt-20 flex flex-col items-center animate-fade-in">
            <div className="flex flex-col items-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-red-500 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12c0 4.97-4.03 9-9 9s-9-4.03-9-9 4.03-9 9-9 9 4.03 9 9z" />
              </svg>
              <h3 className="text-xl font-bold text-gray-800 mb-2">Xác nhận xóa sản phẩm</h3>
              <p className="text-gray-600 text-center text-base mb-1">Bạn có chắc chắn muốn xóa sản phẩm này không?</p>
              <p className="text-gray-500 text-center text-sm">Hành động này không thể hoàn tác.</p>
            </div>
            <div className="flex justify-center gap-4 mt-2 w-full">
              <button
                className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold min-w-[100px] transition-colors"
                onClick={() => setConfirmDeleteId(null)}
              >
                Hủy
              </button>
              <button
                className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold min-w-[100px] shadow-lg transition-colors"
                onClick={confirmDeleteProduct}
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}