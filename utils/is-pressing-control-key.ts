import { KeyboardEvent } from "react"

export const isPressingControlKey = (e: KeyboardEvent<HTMLInputElement>): boolean => 
  e.key === `Backspace` ||
  e.key === `ArrowLeft` ||
  e.key === `ArrowRight` ||
  e.key === `Control` ||
  e.key === `a` ||
  e.key === `c` ||
  e.key === `v`
