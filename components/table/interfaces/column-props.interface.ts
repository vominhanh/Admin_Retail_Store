import { MouseEvent, ReactElement, RefObject } from 'react';

export interface IColumnProps<T> {
  key?: keyof T | `index`
  ref: RefObject<HTMLDivElement | null>
  size: string
  title: string
  onClick?: (e: MouseEvent<HTMLParagraphElement, globalThis.MouseEvent>) => void
  render?: (item: T, key: string, column: IColumnProps<T>) => ReactElement
  isVisible?: boolean
}
