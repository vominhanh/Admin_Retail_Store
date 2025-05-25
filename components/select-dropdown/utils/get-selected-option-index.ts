import { ISelectOption } from "../interfaces/select-option.interface";

export const getSelectedOptionIndex = (
  options: ISelectOption[], value: string, 
): number => {
  const foundIndex: number = options.findIndex((
    option: ISelectOption
  ): boolean => option.value === value);

  return foundIndex >= 0 ? foundIndex : 0;
}
