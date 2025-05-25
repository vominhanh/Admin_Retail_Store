export const createId = (prefix: string): string => {
  const date = new Date();

  return `${prefix}${date.getUTCFullYear()}${date.getUTCMonth()}${date.getUTCDate()}${date.getUTCHours()}${date.getUTCMinutes()}${date.getUTCSeconds()}${date.getUTCMilliseconds()}`;
}
