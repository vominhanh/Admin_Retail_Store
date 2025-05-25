import React, { memo, ReactElement } from 'react';
import { IInputProps } from '../interfaces/input-props.interface';
import Input from '../input/input';

function DateInput({
  min = undefined,
  max = undefined,
  name = ``, 
  value = new Date(),
  isDisable = false, 
  className = `w-full`, 
  style = {
  }, 
  onInputChange = () => {},
  onInputBlur = () => {},
}: Readonly<IInputProps<Date>>): ReactElement {
  // Format the date as YYYY-MM-DD to ensure only date is shown
  const formatDateOnly = (date: Date | string): string => {
    // If date is null, undefined or invalid
    if (!date) return '';
    
    // Convert string date to Date object if needed
    let dateObj: Date;
    
    if (typeof date === 'string') {
      // Parse the string date
      dateObj = new Date(date);
    } else if (date instanceof Date) {
      dateObj = date;
    } else {
      return '';
    }
    
    // Check if date is valid
    if (isNaN(dateObj.getTime())) return '';
    
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  return (
    <Input 
      type={`date`}
      name={name}
      value={formatDateOnly(value)}
      isDisable={isDisable}
      className={className}
      style={style}
      onInputBlur={onInputBlur}
      onInputChange={onInputChange}
      min={min}
      max={max}
    >
    </Input>
  )
}

export default memo( DateInput );
