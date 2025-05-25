import { ObjectId } from 'mongodb';
import { models, model, Schema } from 'mongoose';

const BusinessSchema = new Schema({
  id: { type: ObjectId },
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
    required: [true, 'Tên doanh nghiệp là bắt buộc!'],
    trim: true,
  },
  address: {
    type: String,
    required: [true, 'Địa chỉ là bắt buộc!'],
    trim: true,
  },
  email: {
    type: String,
    trim: true,
    validate: {
      validator: function (v: string) {
        return !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
      },
      message: 'Email không hợp lệ!'
    }
  },
  logo: {
    type: String,
    required: false,
  },
  logo_links: {
    type: [String],
    default: [],
  },
  phone: {
    type: String,
    trim: true,
  }
});

// Middleware tự động cập nhật updated_at
BusinessSchema.pre('save', function (next) {
  this.updated_at = new Date();
  next();
});

export const BusinessModel =
  models.Business || model('Business', BusinessSchema);
