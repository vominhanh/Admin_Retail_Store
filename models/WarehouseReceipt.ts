import { ObjectId } from 'mongodb';
import { models, model, Schema } from 'mongoose';

const WarehouseReceiptSchema = new Schema({
  id: { type: ObjectId, },
  supplier_id: { type: ObjectId, required: true },
  supplier_receipt_id: { type: ObjectId, required: true },
  created_at: {
    type: Date,
    default: () => Date.now(),
    immutable: true,
  },
  updated_at: {
    default: () => Date.now(),
    type: Date,
  },
  receipt_code: {
    type: String,
    required: [false],
  },

  product_details: [
    {
      _id: { type: ObjectId, required: true },
      unit_id: { type: ObjectId, required: true },
      note: { type: String },
      quantity: {
        type: Number,
        required: [true, `Product quantity is required!`],
      },
      date_of_manufacture: {
        type: String,
        required: [true, `Ngày sản xuất là bắt buộc!`]
      },
      expiry_date: {
        type: String,
        required: [true, `Hạn sử dụng là bắt buộc!`]
      },
      batch_number: { type: String },
      input_price: {
        type: Number,
        required: [true, `Giá nhập là bắt buộc!`]
      }
    }
  ],
});

export const WarehouseReceiptModel =
  models.WarehouseReceipt || model(`WarehouseReceipt`, WarehouseReceiptSchema);
