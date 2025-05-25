'use client'

import { Button, Text } from '@/components'
import { EButtonType } from '@/components/button/interfaces/button-type.interface'
import { IErrorProps } from '@/interfaces/error-page-props.interface'
import React from 'react'

export default function Error({ error, reset }: Readonly<IErrorProps>) {
  return (
    <div className="flex flex-col items-center justify-center h-96 w-full">
      <svg className="h-16 w-16 text-red-400 mb-4" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <Text size={28} className="text-red-600 font-bold mb-2">Đã có lỗi xảy ra</Text>
      <Text size={18} className="text-gray-700 mb-4">{error.message}</Text>
      <Button onClick={reset} type={EButtonType.INFO} className="px-6 py-2 rounded-lg bg-blue-500 text-white font-semibold hover:bg-blue-600 transition">
        <Text weight={600}>Thử lại</Text>
      </Button>
    </div>
  )
}
