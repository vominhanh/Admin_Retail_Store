import { ECollectionNames } from '@/enums/collection-names.enum';
import { ERoleAction } from '@/interfaces/role.interface';
import { convertToMongoCollectionName } from '@/utils/convert-to-mongo-collection-name';
import { enumToArray } from '@/utils/enum-to-array';
import { ObjectId } from 'mongodb';
import { models, model, Schema, } from 'mongoose';

const RoleSchema = new Schema({
  id: { type: ObjectId, }, 
  created_at: { 
    type: Date, 
    default: () => Date.now(),
    immutable: true,
  }, 
  updated_at: { 
    default: () => Date.now(),
    type: Date, 
  }, 

  collection_name: {
    type: String, 
    enum: enumToArray(ECollectionNames).map(
      collectionName => 
        convertToMongoCollectionName(collectionName).toLowerCase()
    ), 
    required: [true, `Collection Name is required!`], 
  }, 
  action: {
    type: String, 
    enum: enumToArray(ERoleAction), 
    required: [true, `Action is required!`], 
  }, 
});

export const RoleModel = models.Role || model(`Role`, RoleSchema);
