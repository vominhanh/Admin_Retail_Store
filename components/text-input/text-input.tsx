import React, { HTMLInputTypeAttribute, memo, ReactElement } from 'react';
import { IInputProps } from '../interfaces/input-props.interface';
import Input from '../input/input';

function TextInput({
  name = ``, 
  value = ``,
  isDisable = false, 
  className = `w-full`, 
  style = {
  }, 
  placeholder = ``, 
  onInputChange = () => {},
  onInputBlur = () => {},
  textType = `text`,
}: Readonly<IInputProps<string>> & {
  textType?: HTMLInputTypeAttribute
}): ReactElement {
  return (
    <Input 
      type={textType}
      placeholder={placeholder}
      name={name}
      value={value}
      isDisable={isDisable}
      className={className}
      style={style}
      onInputBlur={onInputBlur}
      onInputChange={onInputChange}
    >
    </Input>
  )
}

export default memo( TextInput );
