import React, { CSSProperties, ReactElement, ReactNode, memo } from 'react';
import { Text } from '@/components';

interface IInputSectionProps {
  children: ReactNode,
  label?: string,
  gridColumns?: string,
  className?: string,
}

function InputSection({
  children,
  label = ``,
  gridColumns = `200px 1fr`,
  className = '',
}: Readonly<IInputSectionProps>): ReactElement {
  const gridStyle: CSSProperties = {
    gridTemplateColumns: gridColumns,
  }

  return (
    <div
      className={`grid gap-2 items-center ${className}`}
      style={gridStyle}
    >
      <label>
        <Text>{label}</Text>
      </label>

      {children}
    </div>
  )
}

export default memo(InputSection);
