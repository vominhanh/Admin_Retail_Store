import { ReactNode } from 'react'

export interface ITabProps {
  label?: string
  children: ReactNode
  isDisable?: boolean
}

export default function TabItem({
  children,
}: Readonly<ITabProps>): ReactNode {
  return (
    children
  )
}
