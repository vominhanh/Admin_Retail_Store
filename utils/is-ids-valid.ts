import { isValidObjectId } from "mongoose";

export const isIdsValid = (ids: string[]): boolean => {
  let result = true;

  for (let i = 0; i < ids.length; i++) {
    if ( !isValidObjectId(ids[i]) ) {
      result = false;
      break;
    }
  };

  return result;
}
