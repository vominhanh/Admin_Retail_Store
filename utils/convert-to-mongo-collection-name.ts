export const convertToMongoCollectionName = (name: string): string => 
  name.replace(/\s/g, ``) + `s`;
