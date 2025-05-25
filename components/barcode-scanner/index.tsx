'use client';

import React, { useState, useRef, useEffect } from 'react';
import { IProductDetail } from '@/interfaces/product-detail.interface';
import { IProduct } from '@/interfaces/product.interface';

interface BarcodeScannerProps {
    onProductFound: (productDetail: IProductDetail, product: IProduct) => void;
    onError?: (message: string) => void;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onProductFound, onError }) => {
    const [barcodeValue, setBarcodeValue] = useState<string>('');
    const [loading, setLoading] = useState<boolean>(false);
    const [error, setError] = useState<string>('');
    const inputRef = useRef<HTMLInputElement>(null);

    // Tự động focus vào input khi component được mount
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.focus();
        }
    }, []);

    const handleBarcodeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setBarcodeValue(e.target.value);
        setError('');
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        // Bấm Enter để tìm kiếm
        if (e.key === 'Enter') {
            handleSearchByBarcode();
        }
    };

    const handleSearchByBarcode = async () => {
        if (!barcodeValue.trim()) {
            setError('Vui lòng nhập mã vạch');
            return;
        }

        setLoading(true);
        setError('');

        try {
            const response = await fetch(`/api/product-detail/barcode/${barcodeValue}`);
            const data = await response.json();

            if (!response.ok || !data.success) {
                const errorMessage = data.message || 'Không tìm thấy sản phẩm';
                setError(errorMessage);
                if (onError) onError(errorMessage);
                return;
            }

            // Xóa giá trị input sau khi tìm thấy
            setBarcodeValue('');

            // Gọi callback với dữ liệu sản phẩm tìm được
            onProductFound(data.productDetail, data.product);

            // Focus lại vào input để tiếp tục quét
            if (inputRef.current) {
                inputRef.current.focus();
            }
        } catch (error) {
            console.error('Lỗi khi tìm kiếm theo barcode:', error);
            setError('Đã xảy ra lỗi khi tìm kiếm');
            if (onError) onError('Đã xảy ra lỗi khi tìm kiếm');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="w-full mb-4">
            <div className="flex items-center gap-2">
                <div className="relative flex-1">
                    <input
                        ref={inputRef}
                        type="text"
                        value={barcodeValue}
                        onChange={handleBarcodeChange}
                        onKeyDown={handleKeyDown}
                        placeholder="Quét hoặc nhập mã vạch..."
                        className="w-full p-2 border border-gray-300 rounded-lg pr-10 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        disabled={loading}
                    />
                    {loading && (
                        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                            <div className="animate-spin h-5 w-5 border-2 border-blue-500 border-t-transparent rounded-full"></div>
                        </div>
                    )}
                </div>
                <button
                    onClick={handleSearchByBarcode}
                    disabled={loading || !barcodeValue.trim()}
                    className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-lg disabled:opacity-50"
                >
                    Tìm
                </button>
            </div>
            {error && (
                <div className="mt-2 text-red-500 text-sm">{error}</div>
            )}
        </div>
    );
};

export default BarcodeScanner; 