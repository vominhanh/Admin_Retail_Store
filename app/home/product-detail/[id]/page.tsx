/* eslint-disable react-hooks/exhaustive-deps */
'use client'

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, LoadingScreen, Text } from '@/components'
import { IProductDetail } from '@/interfaces/product-detail.interface'
import { IProduct } from '@/interfaces/product.interface'
import { ENotificationType } from '@/components/notify/notification/notification'
import useNotificationsHook from '@/hooks/notifications-hook'

type ProductDetailParams = {
  params: {
    id: string;
  }
}

export default function ProductDetail({ params }: ProductDetailParams) {
  const router = useRouter()
  const id = params.id
  const [isLoading, setIsLoading] = useState(true)
  const [productDetail, setProductDetail] = useState<IProductDetail | null>(null)
  const [product, setProduct] = useState<IProduct | null>(null)
  const { createNotification } = useNotificationsHook()
  const [isEditing, setIsEditing] = useState(false)
  const [editedDetail, setEditedDetail] = useState<IProductDetail | null>(null)

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true)
        // Lấy thông tin chi tiết sản phẩm
        const detailResponse = await fetch(`/api/product-detail/${id}`)
        if (!detailResponse.ok) {
          throw new Error('Không thể tải thông tin chi tiết sản phẩm')
        }
        const detailData = await detailResponse.json()
        setProductDetail(detailData)

        // Lấy thông tin sản phẩm
        const productResponse = await fetch(`/api/product/${detailData.product_id}`)
        if (!productResponse.ok) {
          throw new Error('Không thể tải thông tin sản phẩm')
        }
        const productData = await productResponse.json()
        setProduct(productData)
        setEditedDetail(detailData)
      } catch (error) {
        console.error('Lỗi khi tải dữ liệu:', error)
        createNotification({
          type: ENotificationType.ERROR,
          children: <div>Có lỗi xảy ra khi tải thông tin sản phẩm</div>,
          isAutoClose: true,
          id: Math.random(),
        })
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [id])

  const handleSave = async () => {
    if (!editedDetail) return

    try {
      const response = await fetch(`/api/product-detail/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editedDetail),
      })

      if (!response.ok) {
        throw new Error('Không thể cập nhật sản phẩm')
      }

      setProductDetail(editedDetail)
      setIsEditing(false)
      createNotification({
        type: ENotificationType.SUCCESS,
        children: <div>Cập nhật sản phẩm thành công</div>,
        isAutoClose: true,
        id: Math.random(),
      })
    } catch (error) {
      console.error('Lỗi khi cập nhật:', error)
      createNotification({
        type: ENotificationType.ERROR,
        children: <div>Có lỗi xảy ra khi cập nhật sản phẩm</div>,
        isAutoClose: true,
        id: Math.random(),
      })
    }
  }

  const handleDelete = async () => {
    if (!confirm('Bạn có chắc chắn muốn xóa sản phẩm này?')) return

    try {
      const response = await fetch(`/api/product-detail/${id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        throw new Error('Không thể xóa sản phẩm')
      }

      createNotification({
        type: ENotificationType.SUCCESS,
        children: <div>Xóa sản phẩm thành công</div>,
        isAutoClose: true,
        id: Math.random(),
      })
      router.push('/home/product-detail')
    } catch (error) {
      console.error('Lỗi khi xóa:', error)
      createNotification({
        type: ENotificationType.ERROR,
        children: <div>Có lỗi xảy ra khi xóa sản phẩm</div>,
        isAutoClose: true,
        id: Math.random(),
      })
    }
  }

  if (isLoading) {
    return <LoadingScreen />
  }

  if (!productDetail || !product) {
    return (
      <div className="min-h-screen bg-gray-100 py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="bg-white rounded-lg shadow-md p-6">
            <Text size={18} className="text-red-600">Không tìm thấy thông tin sản phẩm</Text>
            <Button
              className="mt-4 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              onClick={() => router.push('/home/product-detail')}
            >
              Quay lại danh sách
            </Button>
          </div>
        </div>
      </div>
    )
  }

  const expiryDate = new Date(productDetail.expiry_date)
  const today = new Date()
  const daysUntilExpiry = Math.ceil((expiryDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
  const isExpired = daysUntilExpiry < 0
  const isExpiring = daysUntilExpiry >= 0 && daysUntilExpiry <= 30

  const formatDateForInput = (date: Date | string) => {
    const d = new Date(date);
    return d.toISOString().split('T')[0];
  };

  const formatDateToISO = (dateStr: string) => {
    return new Date(dateStr);
  };

  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          {/* Header */}
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{product.name}</h1>
                <p className="text-sm text-gray-500 mt-1">Mã sản phẩm: {productDetail._id}</p>
              </div>
              <div className="flex items-center gap-2">
                {!isEditing ? (
                  <>
                    <Button
                      className="bg-yellow-500 text-white px-4 py-2 rounded-lg hover:bg-yellow-600 transition-colors flex items-center gap-2"
                      onClick={() => setIsEditing(true)}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      <span>Chỉnh sửa</span>
                    </Button>
                    <Button
                      className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors flex items-center gap-2"
                      onClick={handleDelete}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      <span>Xóa</span>
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                      onClick={handleSave}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span>Lưu</span>
                    </Button>
                    <Button
                      className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 transition-colors flex items-center gap-2"
                      onClick={() => {
                        setIsEditing(false)
                        setEditedDetail(productDetail)
                      }}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      <span>Hủy</span>
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6">
            <div className="grid grid-cols-2 gap-6">
              {/* Thông tin số lượng */}
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Tồn kho</label>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editedDetail?.inventory || 0}
                      onChange={(e) => setEditedDetail(prev => prev ? { ...prev, inventory: parseInt(e.target.value) } : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <div className="bg-gray-50 px-4 py-3 rounded-lg">
                      <Text size={18} className="font-semibold">{productDetail.inventory}</Text>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Số lượng nhập</label>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editedDetail?.input_quantity || 0}
                      onChange={(e) => setEditedDetail(prev => prev ? { ...prev, input_quantity: parseInt(e.target.value) } : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <div className="bg-gray-50 px-4 py-3 rounded-lg">
                      <Text size={18} className="font-semibold">{productDetail.input_quantity}</Text>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Số lượng xuất</label>
                  {isEditing ? (
                    <input
                      type="number"
                      value={editedDetail?.output_quantity || 0}
                      onChange={(e) => setEditedDetail(prev => prev ? { ...prev, output_quantity: parseInt(e.target.value) } : null)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <div className="bg-gray-50 px-4 py-3 rounded-lg">
                      <Text size={18} className="font-semibold">{productDetail.output_quantity}</Text>
                    </div>
                  )}
                </div>
              </div>

              {/* Thông tin ngày tháng */}
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Ngày sản xuất</label>
                  {isEditing ? (
                    <input
                      type="date"
                      value={editedDetail ? formatDateForInput(editedDetail.date_of_manufacture) : ''}
                      onChange={(e) => {
                        if (!editedDetail) return;
                        const newDate = formatDateToISO(e.target.value);
                        setEditedDetail({
                          ...editedDetail,
                          date_of_manufacture: newDate
                        });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <div className="bg-gray-50 px-4 py-3 rounded-lg">
                      <Text size={18} className="font-semibold">
                        {new Date(productDetail.date_of_manufacture).toLocaleDateString('vi-VN')}
                      </Text>
                    </div>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Hạn sử dụng</label>
                  {isEditing ? (
                    <input
                      type="date"
                      value={editedDetail ? formatDateForInput(editedDetail.expiry_date) : ''}
                      onChange={(e) => {
                        if (!editedDetail) return;
                        const newDate = formatDateToISO(e.target.value);
                        setEditedDetail({
                          ...editedDetail,
                          expiry_date: newDate
                        });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <div className="bg-gray-50 px-4 py-3 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className={`px-3 py-1 rounded-full text-sm font-medium ${isExpired
                          ? 'bg-red-100 text-red-800'
                          : isExpiring
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-green-100 text-green-800'
                          }`}>
                          {new Date(productDetail.expiry_date).toLocaleDateString('vi-VN')}
                        </span>
                        <span className="text-sm text-gray-500">
                          {isExpired
                            ? `(Đã hết hạn ${Math.abs(daysUntilExpiry)} ngày)`
                            : isExpiring
                              ? `(Còn ${daysUntilExpiry} ngày)`
                              : `(Còn ${daysUntilExpiry} ngày)`}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 border-t border-gray-200">
            <Button
              className="text-gray-700 hover:text-gray-900 transition-colors flex items-center gap-2"
              onClick={() => router.push('/home/product-detail')}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Quay lại danh sách</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
