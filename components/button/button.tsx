'use client';

import React, { CSSProperties, ReactElement, ReactNode } from 'react';
import styles from './style.module.css';
import { EButtonType } from './interfaces/button-type.interface';

interface IButtonProps
// extends ButtonHTMLAttributes<HTMLButtonElement> 
{
  children: ReactNode
  isDisable?: boolean
  isLoading?: boolean
  onClick?: (event?: React.MouseEvent<HTMLButtonElement>) => void
  type?: EButtonType
  style?: CSSProperties
  className?: string
  title?: string
}

export default function Button({
  children,
  isDisable = false,
  isLoading = false,
  onClick = () => { },
  type = EButtonType.TRANSPARENT,
  style = {},
  className = ``,
  title = ``,
}: Readonly<IButtonProps>): ReactElement {
  const buttonStyle: CSSProperties = {
    ...style,
  }

  return (
    <button
      title={title}
      className={`p-2 rounded-lg relative flex items-center justify-center w-full cursor-pointer ${styles.button} ${styles[type]} ${isLoading ? styles.loading : ``} ${className}`}
      style={buttonStyle}
      onClick={onClick}
      disabled={isDisable}
    >
      {children}
    </button>
  )
}
