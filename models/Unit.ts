import { ObjectId } from 'mongodb';
import { models, model, Schema } from 'mongoose';

const UnitSchema = new Schema({
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
  equal: {
    type: Number,
    required: [true, `Equal is required!`],
  },
});

export const UnitModel = models.Unit || model(`Unit`, UnitSchema);
