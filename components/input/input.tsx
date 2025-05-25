import React, { KeyboardEvent, ChangeEvent, CSSProperties, HTMLInputTypeAttribute, memo, ReactElement } from 'react';
import { IInputProps } from '../interfaces/input-props.interface';
import styles from './style.module.css';

function Input({
  type = `text`,
  name = ``,
  value = ``,
  isDisable = false,
  className = ``,
  style = {},
  min = 0,
  max = 9999999,
  isRequire = false,
  pattern = `.{1.}`,
  onInputChange = () => { },
  onInputBlur = () => { },
  onInputKeyDown = () => { },
  placeholder = ``,
  step = 1,
}: Readonly<IInputProps<string> & { type: HTMLInputTypeAttribute }>
): ReactElement {
  const inputStyle: CSSProperties = {
    ...style,
  }

  const handleChange = (e: ChangeEvent<HTMLInputElement>): void =>
    onInputChange(e);

  const handleBlur = (e: ChangeEvent<HTMLInputElement>): void =>
    onInputBlur(e);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>): void =>
    onInputKeyDown(e);

  return (
    <input
      name={name}
      min={min}
      max={max}
      style={inputStyle}
      className={`w-full p-2 rounded-lg outline-none ${className} ${styles.input}`}
      type={type}
      value={value}
      disabled={isDisable}
      onChange={handleChange}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      required={isRequire}
      pattern={pattern}
      step={step}
    >
    </input>
  )
}

export default memo(Input);
