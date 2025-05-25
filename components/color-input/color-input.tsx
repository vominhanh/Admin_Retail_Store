import React, { memo, ReactElement } from 'react';
import { IInputProps } from '../interfaces/input-props.interface';
import Input from '../input/input';

function ColorInput({
  name = ``, 
  value = `#000000`,
  isDisable = false, 
  className = `w-full`, 
  style = {}, 
  pattern = `#[a-fA-F0-9]{6}`,
  placeholder = ``, 
  onInputChange = () => {},
  onInputBlur = () => {},
}: Readonly<IInputProps<string>>): ReactElement {
  return (
    <Input 
      type={`color`}
      placeholder={placeholder}
      name={name}
      value={value}
      isDisable={isDisable}
      className={className}
      style={style}
      onInputBlur={onInputBlur}
      onInputChange={onInputChange}
      pattern={pattern}
    >
    </Input>
  )
}

export default memo( ColorInput );
