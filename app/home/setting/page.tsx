'use client'

import React from 'react'
import { Button } from '@/components'
import { changeTheme } from '@/utils/change-theme'
import { EButtonType } from '@/components/button/interfaces/button-type.interface'

export default function Setting() {
  return (
    <>
      <Button onClick={changeTheme} type={EButtonType.INFO}>Đổi giao diện</Button>
    </>
  )
}
