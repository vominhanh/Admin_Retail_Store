export const countVisibleElements = (array: boolean[]): number => 
  array.reduce((accumulator: number, currentValue: boolean): number => 
    currentValue ? accumulator + 1 : accumulator, 
    0,
  );
