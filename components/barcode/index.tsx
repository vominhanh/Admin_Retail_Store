'use client';

import React from 'react';
import Barcode from 'react-barcode';

interface BarcodeProps {
    value: string;
    width?: number;
    height?: number;
    displayValue?: boolean;
    className?: string;
}

const BarcodeComponent: React.FC<BarcodeProps> = ({
    value,
    width = 2,
    height = 100,
    displayValue = true,
    className = '',
}) => {
    if (!value) {
        return <div className="text-red-500">Không thể tạo mã vạch: Giá trị không hợp lệ</div>;
    }

    return (
        <div className={`flex justify-center ${className}`}>
            <Barcode
                value={value}
                width={width}
                height={height}
                displayValue={displayValue}
                margin={10}
                background='#ffffff'
            />
        </div>
    );
};

export default BarcodeComponent; 