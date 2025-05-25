import { Model } from "mongoose";

export const isIdsExist = async <T>(
  ids: string[], collectionModel: Model<T>
): Promise<boolean> => {
  let result = true;

  for (let i = 0; i < ids.length; i++) {
    const foundCollection = await collectionModel.findById(ids[i]);

    if (!foundCollection) {
      result = false;
      break;
    }
  }

  return result;

  // console.log(`IDs`, 
  //   ids.every(async (id: string, index: number): Promise<boolean> => {
  //     const foundCollection = await collectionModel.findById(id);

  //     console.log(
  //       `Found Collection`, 
  //       index, 
  //       foundCollection, 
  //       !!foundCollection == true
  //     );
  //     return !!foundCollection == true;
  //   })
  // );

  // return ids.some(async (id: string): Promise<boolean> => {
  //   const foundCollection = await collectionModel.findById(id);

  //   // console.log(`Found Collection`, foundCollection, !!foundCollection == true);
  //   return !!foundCollection == false;
  // });
}
