import { IProductDetail } from '@/interfaces/product-detail.interface';
import { IProduct } from '@/interfaces/product.interface';
import { ObjectId } from 'mongodb';
import { models, model, Schema } from 'mongoose';

const ProductDetailSchema = new Schema({
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

  product_id: {
    type: ObjectId,
    required: [true, `Supplier is required!`],
  },
  input_quantity: {
    type: Number,
    required: [true, `Input Quantity is required!`],
  },
  output_quantity: {
    type: Number,
    required: [true, `Output Quantity is required!`],
  },
  inventory: {
    type: Number,
    default: function (this: IProductDetail) {
      return this.input_quantity - this.output_quantity;
    }
  },
  date_of_manufacture: {
    type: Date,
    default: () => Date.now(),
  },
  expiry_date: {
    default: () => Date.now(),
    type: Date,
  },
  batch_number: {
    type: String,
    default: '',
  },
  barcode: {
    type: String,
    default: '',
  },
});

export const ProductDetailModel =
  models.ProductDetail || model(`ProductDetail`, ProductDetailSchema);
