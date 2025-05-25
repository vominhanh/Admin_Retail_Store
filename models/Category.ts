import { Schema, model, models, Types } from 'mongoose';

const CategorySchema = new Schema({
  _id: {
    type: Types.ObjectId,
    auto: true,
  },
  name: {
    type: String,
    required: [true, 'Tên loại sản phẩm là bắt buộc!'],
    trim: true,
  },
  code: {
    type: String,
    default: '',
    trim: true,
  },
  discount: {
    type: Number,
    default: 0,
  },
  created_at: {
    type: Date,
    default: Date.now,
    immutable: true,
  },
  updated_at: {
    type: Date,
    default: Date.now,
  },
});

export const CategoryModel = models.Category2 || model('Category2', CategorySchema);
