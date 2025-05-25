'use client';

import { useEffect } from 'react'

interface ErrorProps {
    error: Error;
    reset: () => void;
}

const Error = ({ error, reset }: ErrorProps) => {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error(error)
    }, [error])

    return (
        <div className="flex flex-col items-center justify-center min-h-[80vh] p-4 text-center">
            <h2 className="text-2xl font-semibold text-red-600 mb-4">Đã xảy ra lỗi!</h2>
            <p className="text-gray-700 mb-6">
                {error?.message || 'Đã có lỗi xảy ra khi tạo phiếu đặt hàng mới.'}
            </p>
            <button
                onClick={reset}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-all"
            >
                Thử lại
            </button>
        </div>
    )
}

export default Error; 