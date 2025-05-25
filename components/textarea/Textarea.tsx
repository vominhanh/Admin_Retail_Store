/* eslint-disable @typescript-eslint/no-unused-vars */
import React, { ChangeEvent, CSSProperties, memo, ReactElement } from 'react';

function Textarea({
  name = ``, 
  value = ``,
  isDisable = false, 
  className = `w-full`, 
  style = {}, 
  placeholder = ``, 
  onInputChange = (e: ChangeEvent<HTMLTextAreaElement>) => {},
  onInputBlur = (e: ChangeEvent<HTMLTextAreaElement>) => {},
}: Readonly<{
  name: string, 
  value: string,
  isDisable?: boolean, 
  className?: string, 
  style?: CSSProperties, 
  placeholder?: string, 
  onInputChange?: (e: ChangeEvent<HTMLTextAreaElement>) => void,
  onInputBlur?: (e: ChangeEvent<HTMLTextAreaElement>) => void,
}>): ReactElement {
  return (
    <textarea
      placeholder={placeholder}
      name={name}
      value={value}
      disabled={isDisable}
      className={className}
      style={style}
      onBlur={onInputBlur}
      onChange={onInputChange}
    >
    </textarea>
  )
}

export default memo( Textarea );
