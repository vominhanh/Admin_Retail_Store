import { ObjectId } from 'mongodb';
import { models, model, Schema, } from 'mongoose';

const RoleGroupSchema = new Schema({
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

  name: {
    type: String, 
    required: [true, `Name is required!`], 
  }, 
  role_ids: {
    type: [ObjectId], 
    required: [true, `Role IDs is required!`], 
  }, 
});

export const RoleGroupModel = models.RoleGroup || model(`RoleGroup`, RoleGroupSchema);
