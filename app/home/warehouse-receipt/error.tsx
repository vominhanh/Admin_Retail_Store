'use client'

import { Button, Text } from '@/components'
import { EButtonType } from '@/components/button/interfaces/button-type.interface'
import { IErrorProps } from '@/interfaces/error-page-props.interface'
import React, { ReactElement } from 'react'

export default function Error({
  error, 
  reset
}: Readonly<IErrorProps>): ReactElement {
  return (
    <>
      <Text size={32}>Đã có lỗi xảy ra: {error.message}</Text>
      <div className={`w-fit`}>
        <Button onClick={reset} type={EButtonType.INFO}>
          <Text weight={600}>Thử lại</Text>
        </Button>
      </div>
    </>
  )
}
