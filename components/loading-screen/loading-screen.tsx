import React, { CSSProperties, ReactElement } from 'react';
import { TColorMode } from '../interfaces/color-mode.interface';
import { LoadingIcon } from '..';

interface ILoadingScreenProps {
  overlayColor?: TColorMode
  isOpen?: boolean
  blur?: string
}

export default function LoadingScreen({
  overlayColor = {
    light: `#ffffff99`,
    dark: `#00000099`, 
  },
  isOpen = true, 
  blur = `4px`,
}: Readonly<ILoadingScreenProps>): ReactElement {
  const overlayStyle: CSSProperties = {
    display: isOpen ? `initial` : `none`,
    background: `light-dark(${overlayColor.light}, ${overlayColor.dark})`,
    backdropFilter: `blur(${blur})`,
  }

  return (
    <>
      <div
        style={overlayStyle}
        className={`w-screen h-screen z-50 top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 absolute`}
      >
        <LoadingIcon></LoadingIcon>
      </div>
    </>
  )
}
