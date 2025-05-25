import React, { CSSProperties, MouseEvent, ReactElement, ReactNode } from 'react';
import { TColorMode } from '@/components/interfaces/color-mode.interface';
import styles from './style.module.css';

interface ITextProps {
  onClick?: (e: MouseEvent<HTMLParagraphElement, globalThis.MouseEvent>) => void
  isCopyable?: boolean
  children: ReactNode
  fontFamily?: string
  size?: number
  weight?: number
  lineHeight?: number
  color?: TColorMode
  isEllipsis?: boolean
  isCenter?: boolean
  isOutlined?: boolean
  outlineWidth?: string
  isItalic?: boolean
  tooltip?: string
  style?: CSSProperties
  className?: string
}

export default function Text({ 
  onClick = () => {},
  children, 
  fontFamily, 
  size = 16, 
  weight = 400, 
  color = {
    light: `#000000`,
    dark: `#ffffff`
  }, 
  isEllipsis = false, 
  isCenter = false, 
  isOutlined = false, 
  outlineWidth = `1px`, 
  isItalic = false, 
  tooltip = ``, 
  style = {}, 
  className = ``, 
}: Readonly<ITextProps>): ReactElement {
  const outlineColor: string = `light-dark(${color.dark}, ${color.light})`;

  const textStyle: CSSProperties = {
    fontFamily: fontFamily ? fontFamily : ``, 
    fontSize: size,
    fontWeight: weight,
    fontStyle: isItalic ? `italic` : `none`, 
    textAlign: isCenter ? `center` : `initial`, 
    textShadow: isOutlined 
      ? `-${outlineWidth} -${outlineWidth} 0 ${outlineColor}, ${outlineWidth} -${outlineWidth} 0 ${outlineColor}, -${outlineWidth} ${outlineWidth} 0 ${outlineColor}, ${outlineWidth} ${outlineWidth} 0 ${outlineColor}` 
      : `none`, 
    ...style, 
  }

  const getEllipsisStyles = (): string => 
    isEllipsis ? `whitespace-nowrap overflow-hidden text-ellipsis` : ``;

  const handleOnClick = (
    e: MouseEvent<HTMLParagraphElement, globalThis.MouseEvent>
  ): void => {
    onClick(e);
  }

  return (
    <p 
      title={tooltip}
      className={`${getEllipsisStyles()} ${className} ${styles.text}`} 
      style={textStyle}
      onClick={
        (e: MouseEvent<HTMLParagraphElement, globalThis.MouseEvent>): void => 
          handleOnClick(e)
      }
    >
      {children}
    </p>
  )
}
