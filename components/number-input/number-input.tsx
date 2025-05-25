import React, { memo, ReactElement } from 'react';
import { IInputProps } from '../interfaces/input-props.interface';
import Input from '../input/input';

function NumberInput({
  name = ``,
  value = `0`,
  isDisable = false,
  className = `w-full`,
  style = {},
  pattern = `\\d*`,
  min = 0,
  max = 9999999,
  placeholder = ``,
  onInputChange = () => { },
  onInputBlur = () => { },
  step = 0,
}: Readonly<IInputProps<string>>): ReactElement {
  return (
    <Input
      type={`text`}
      min={min}
      max={max}
      placeholder={placeholder}
      name={name}
      value={value}
      isDisable={isDisable}
      className={className}
      style={style}
      onInputBlur={onInputBlur}
      onInputChange={onInputChange}
      pattern={pattern}
      step={step}
    >
    </Input>
  )
}

export default memo(NumberInput);
