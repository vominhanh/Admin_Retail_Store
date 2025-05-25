export const enumToArray = (e: object): string[] => {
  const resultArray: string[] = Object.values(e);
  return resultArray;
}

export const enumToKeyValueObject = (
  e: object
): {keys: string[], values: string[]} => {
  const keyPairs: string[][] = Object.entries(e);

  const keys = keyPairs.map((array: string[]): string => array[0]);
  const values = keyPairs.map((array: string[]): string => array[1]);
  
  return {
    keys, values
  };
}

export const enumToKeyValueArray = (e: object): string[][] => {
  const resultArray: string[][] = Object.entries(e);
  return resultArray;
}
