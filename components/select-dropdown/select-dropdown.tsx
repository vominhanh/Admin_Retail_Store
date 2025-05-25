import { ChangeEvent, ReactElement } from "react";
import { ISelectOption } from "./interfaces/select-option.interface";
import LoadingIcon from "../loading-icon/loading-icon";
import styles from './style.module.css';

interface ISelectDropdownProps {
  name?: string
  isLoading?: boolean
  isDisable?: boolean
  options?: ISelectOption[]
  defaultOptionIndex?: number
  isSelectMultiple?: boolean
  onInputChange?: (e: ChangeEvent<HTMLSelectElement>) => void
  className?: string
}

export default function SelectDropdown({
  name = ``,
  isLoading = false,
  isDisable = false,
  options = [],
  defaultOptionIndex = 0,
  isSelectMultiple = false,
  onInputChange = () => { },
  className = '',
}: Readonly<ISelectDropdownProps>): ReactElement {
  // Xác định giá trị value an toàn
  const isValidIndex = options.length > 0 &&
    defaultOptionIndex >= 0 &&
    defaultOptionIndex < options.length &&
    options[defaultOptionIndex] !== undefined;

  const selectValue = isValidIndex ? options[defaultOptionIndex].value : "";

  return (
    isLoading ?
      <div className="flex items-center justify-center py-2">
        <LoadingIcon></LoadingIcon>
      </div> :
      <select
        name={name}
        disabled={isDisable}
        className={`p-2.5 block w-full rounded-md border border-gray-300 bg-white shadow-sm focus:border-blue-500 focus:ring-blue-500 focus:outline-none ${isDisable ? 'bg-gray-100 text-gray-500 cursor-not-allowed' : 'text-gray-700 cursor-pointer'} ${styles.select} ${className}`}
        onChange={onInputChange}
        value={selectValue}
        multiple={isSelectMultiple}
      >
        {options.length === 0 && (
          <option value="" disabled>Không có lựa chọn</option>
        )}
        {options.map((option: ISelectOption, index: number): ReactElement =>
          <option key={index} value={option.value} className="py-2">
            {option.label}
          </option>
        )}
      </select>
  )
}
