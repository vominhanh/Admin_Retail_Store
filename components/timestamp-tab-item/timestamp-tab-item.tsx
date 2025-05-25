import React, { ReactElement } from 'react'
import InputSection from '@/app/home/components/input-section/input-section'
import DatetimeInput from '../datetime-input/datetime-input'

interface ITimestampTabItemProps<T> {
  isModalReadOnly?: boolean
  collection: T
}

export default function TimestampTabItem<T extends {
  created_at: Date, 
  updated_at: Date, 
}>({
  isModalReadOnly = true, 
  collection, 
}: Readonly<ITimestampTabItemProps<T>>): ReactElement {
  return (
    <>
      <InputSection label={`Ngày tạo`}>
        <DatetimeInput
          name={`created_at`}
          isDisable={isModalReadOnly}
          value={collection.created_at}
        >
        </DatetimeInput>
      </InputSection>

      <InputSection label={`Ngày cập nhật`}>
        <DatetimeInput
          name={`updated_at`}
          isDisable={isModalReadOnly}
          value={collection.updated_at}
        >
        </DatetimeInput>
      </InputSection>
    </>
  )
}
