import React from 'react';

export default function Loading() {
  return (
    <div className="flex flex-col items-center justify-center h-96 w-full animate-pulse">
      <svg className="animate-spin h-12 w-12 text-blue-500 mb-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path>
      </svg>
      <div className="text-xl text-blue-700 font-semibold">Đang tải dữ liệu thống kê doanh thu...</div>
    </div>
  );
}
