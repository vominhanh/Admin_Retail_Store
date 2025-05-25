export const pad = (
  numberToPad: string = ``, 
  width: number = 0, 
  paddingCharacter: string = `0`, 
): string => numberToPad.length >= width 
  ? numberToPad : 
  new Array(width - numberToPad.length + 1).join(paddingCharacter) + numberToPad;
