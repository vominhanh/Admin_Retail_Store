'use client';

import React, { ChangeEvent, CSSProperties, memo, ReactElement } from 'react';
import { TColorMode } from '@/components/interfaces/color-mode.interface';

interface ICheckboxProps {
  name?: string
  size?: number
  background?: TColorMode
  borderWidth?: number
  borderColor?: string
  borderRadius?: number
  padding?: number
  isChecked?: boolean
  isDisable?: boolean
  onInputChange?: (e: ChangeEvent<HTMLInputElement>) => void
  onInputBlur?: (e: ChangeEvent<HTMLInputElement>) => void
}

function Checkbox({
  name = ``,
  size = 16,
  background = {
    light: `#ffffff`,
    dark: `#000000`
  },
  borderWidth = 0,
  borderColor = `#ffffff`,
  borderRadius = 4,
  padding = 0,
  isChecked = false,
  isDisable = false,
  onInputChange = () => { },
  onInputBlur = () => { },
}: Readonly<ICheckboxProps>): ReactElement {
  const inputStyle: CSSProperties = {
    background: `light-dark(${background.light}, ${background.dark})`,
    width: size,
    height: size,
    borderStyle: `solid`,
    borderWidth: borderWidth,
    borderColor: borderColor,
    borderRadius: borderRadius,
    padding: padding,
    // fieldSizing: `content`,
  }

  const handleChange = (e: ChangeEvent<HTMLInputElement>): void =>
    onInputChange(e);

  const handleBlur = (e: ChangeEvent<HTMLInputElement>): void =>
    onInputBlur(e);

  return (
    <input
      name={name}
      style={inputStyle}
      type={`checkbox`}
      checked={isChecked}
      onChange={handleChange}
      onBlur={handleBlur}
      className={`w-full`}
      disabled={isDisable}
    >
    </input>
  )
}

export default memo(Checkbox);
