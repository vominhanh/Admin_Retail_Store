'use client';

import React, { useEffect } from 'react';
import { generateBatchNumber } from '@/utils/batch-number';
import BarcodeDisplay from './index';

interface BarcodeComponentProps {
    productId: string;
    value: string;
    onChange: (value: string) => void;
    showBarcode?: boolean;
}

const BarcodeComponent: React.FC<BarcodeComponentProps> = ({
    productId,
    value,
    onChange,
    showBarcode = false
}) => {
    useEffect(() => {
        // Tự động tạo số lô khi productId thay đổi và không có giá trị
        if (productId && !value) {
            const newBatchNumber = generateBatchNumber(productId);
            onChange(newBatchNumber);
        }
    }, [productId, value, onChange]);

    const handleGenerateBatchNumber = () => {
        if (!productId) {
            alert('Vui lòng chọn sản phẩm trước khi tạo số lô');
            return;
        }

        const newBatchNumber = generateBatchNumber(productId);
        onChange(newBatchNumber);
    };

    return (
        <div className="flex flex-col space-y-2">
            <div className="relative">
                {value ? (
                    <div className="flex items-center">
                        <div className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-700 overflow-hidden whitespace-nowrap overflow-ellipsis">
                            {value}
                        </div>
                    </div>
                ) : null}
            </div>

            {showBarcode && value && (
                <div className="mt-2">
                    <BarcodeDisplay
                        value={value}
                        width={1.5}
                        height={50}
                        displayValue={true}
                        className="border border-gray-300 rounded-lg p-2 bg-white"
                    />
                </div>
            )}
        </div>
    );
};

export default BarcodeComponent; 