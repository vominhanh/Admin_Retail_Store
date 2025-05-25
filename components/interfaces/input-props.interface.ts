import { KeyboardEvent, ChangeEvent, CSSProperties } from "react"

export interface IInputProps<T> {
  value?: T 
  name?: string
  isDisable?: boolean
  className?: string 
  style?: CSSProperties
  placeholder?: string
  min?: number | string
  max?: number | string
  isRequire?: boolean
  pattern?: string
  step?: number
  onInputChange?: (e: ChangeEvent<HTMLInputElement>) => void
  onInputBlur?: (e: ChangeEvent<HTMLInputElement>) => void
  onInputKeyDown?: (e: KeyboardEvent<HTMLInputElement>) => void
}
