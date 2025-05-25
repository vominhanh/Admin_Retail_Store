/* eslint-disable @typescript-eslint/no-explicit-any */
'use client';

import React, { useState } from 'react';
import { IProductDetail } from '@/interfaces/product-detail.interface';

interface BarcodeScannerProps {
    onProductFound: (productDetail: IProductDetail, product: any) => void;
    onError: (message: string) => void;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onProductFound, onError }) => {
    const [barcodeValue, setBarcodeValue] = useState<string>('');
    const [isSearching, setIsSearching] = useState<boolean>(false);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setBarcodeValue(e.target.value);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!barcodeValue.trim()) {
            onError('Vui lòng nhập mã vạch');
            return;
        }

        setIsSearching(true);
        try {
            // Sử dụng API App Router mới
            const response = await fetch(`/api/product-detail/barcode/${barcodeValue}?t=${Date.now()}`);

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Không tìm thấy sản phẩm với mã vạch này');
            }

            const data = await response.json();

            if (!data.productDetail) {
                throw new Error('Không tìm thấy sản phẩm với mã vạch này');
            }

            // Gọi callback khi tìm thấy sản phẩm
            onProductFound(data.productDetail, data.product);

            // Xóa giá trị input sau khi quét thành công
            setBarcodeValue('');
        } catch (error) {
            console.error('Lỗi khi quét mã vạch:', error);
            onError(error instanceof Error ? error.message : 'Không thể tìm kiếm sản phẩm');
        } finally {
            setIsSearching(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="flex-1 flex items-center">
            <div className="relative flex-1">
                <input
                    type="text"
                    value={barcodeValue}
                    onChange={handleInputChange}
                    placeholder="Quét mã vạch..."
                    className="w-full p-2 pr-10 border border-gray-300 rounded-lg"
                    autoComplete="off"
                />
                {isSearching && (
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-blue-500"></div>
                    </div>
                )}
            </div>
            <button
                type="submit"
                className="ml-2 bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg flex items-center"
                disabled={isSearching}
            >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                Tìm
            </button>
        </form>
    );
};

export default BarcodeScanner; 