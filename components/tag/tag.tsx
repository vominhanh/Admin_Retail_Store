import React, { CSSProperties, ReactElement, ReactNode, memo } from 'react';
import Button from '../button/button';
import IconContainer from '../icon-container/icon-container';
import x from '@/public/x.svg?url';
import { TColorMode } from '@/components/interfaces/color-mode.interface';

interface ITagProps {
  isDisable?: boolean
  children: ReactNode
  padding?: number
  background?: TColorMode
  color?: TColorMode
  style?: CSSProperties,
  onDoubleClickAction?: () => void
  onCloseAction?: () => void
}

function Tag({
  isDisable = false, 
  children,
  padding = 6,
  background = {
    light: `#eeeeee`, 
    dark: `#121212`
  },
  color = {
    light: `#000000`,
    dark: `#ffffff`
  },
  style = {}, 
  onDoubleClickAction = () => {},
  onCloseAction = () => {}, 
}: Readonly<ITagProps>): ReactElement {
  const tagStyle: CSSProperties = {
    padding: padding,
    background: `light-dark(${background.light}, ${background.dark})`,
    color: `light-dark(${color.light}, ${color.dark})`,
    gap: padding,
    borderRadius: 4,
    ...style, 
  }

  const handleDoubleClick = (): void => {
    onDoubleClickAction();
  }

  const handleClose = (): void => {
    onCloseAction();
  }

  return (
    <span
      style={tagStyle}
      className={`flex w-max items-center`}
      onDoubleClick={handleDoubleClick}
    >
      {children}

      {!isDisable &&
        <div>
          <Button onClick={handleClose}>
            <IconContainer iconLink={x}>
            </IconContainer>
          </Button>
        </div>
      }
    </span>
  )
}

export default memo( Tag );
