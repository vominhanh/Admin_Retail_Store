import React from 'react';
import { Button, Text } from '@/components';

interface IConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
    onCancel: () => void;
    type?: 'warning' | 'danger' | 'info';
}

const ConfirmModal: React.FC<IConfirmModalProps> = ({
    isOpen,
    title,
    message,
    confirmText = 'Xác nhận',
    cancelText = 'Hủy',
    onConfirm,
    onCancel,
    type = 'warning'
}) => {
    if (!isOpen) return null;

    const getIconColor = () => {
        switch (type) {
            case 'danger':
                return 'text-red-500 bg-red-100';
            case 'info':
                return 'text-blue-500 bg-blue-100';
            default:
                return 'text-amber-500 bg-amber-100';
        }
    };

    const getButtonColor = () => {
        switch (type) {
            case 'danger':
                return 'bg-red-500 hover:bg-red-600';
            case 'info':
                return 'bg-blue-500 hover:bg-blue-600';
            default:
                return 'bg-amber-500 hover:bg-amber-600';
        }
    };

    return (
        <>
            {/* Overlay xám mờ, không che sidebar */}
            <div className="fixed left-[240px] right-0 top-0 bottom-0 bg-gray-200 bg-opacity-80 z-[99]"></div>
            {/* Modal xác nhận */}
            <div className="fixed left-0 right-0 top-8 flex items-start justify-center z-[100] pointer-events-none">
                <div className="bg-white rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl border border-gray-100 animate-fade-in pointer-events-auto">
                    <div className="flex flex-col items-center mb-4">
                        <div className={`p-4 rounded-full ${getIconColor()} mb-2`}>
                            {type === 'danger' ? (
                                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            ) : type === 'info' ? (
                                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            ) : (
                                <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                </svg>
                            )}
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 mb-1 text-center">{title}</h3>
                    </div>
                    <p className="text-gray-600 text-center mb-8 text-base leading-relaxed">{message}</p>
                    <div className="flex justify-center gap-4">
                        <Button
                            onClick={onCancel}
                            className="px-6 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg font-semibold shadow-sm border border-gray-500 transition-colors"
                        >
                            <Text>{cancelText}</Text>
                        </Button>
                        <Button
                            onClick={onConfirm}
                            className={`px-6 py-2 text-white font-semibold shadow-sm ${getButtonColor()} rounded-lg  border border-gray-200 transition-colors`}
                        >
                            <Text>{confirmText}</Text>
                        </Button>
                    </div>
                </div>
            </div>
        </>
    );
};

export default ConfirmModal; 