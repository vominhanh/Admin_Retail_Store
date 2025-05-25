import { EUserGender } from '@/enums/user-gender.enum';
import { enumToArray } from '@/utils/enum-to-array';
import { ObjectId } from 'mongodb';
import { models, model, Schema } from 'mongoose';

const UserSchema = new Schema({
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

  account_id: { type: ObjectId, },
  name: {
    type: String,
    required: [true, `Name is required!`],
  },
  address: {
    type: String,
    required: [true, `Address is required!`],
  },
  email: { type: String, },
  birthday: { type: Date, },
  gender: {
    type: String,
    enum: enumToArray(EUserGender),
  },
  avatar: { type: String },
});

export const UserModel = models.User || model(`User`, UserSchema);
