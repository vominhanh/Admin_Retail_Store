import { ObjectId } from 'mongodb';
import { models, model, Schema } from 'mongoose';

const OrderFormSchema = new Schema({
  id: { type: ObjectId, },
  supplier_id: { type: ObjectId, },
  created_at: {
    type: Date,
    default: () => Date.now(),
    immutable: true,
  },
  updated_at: {
    default: () => Date.now(),
    type: Date,
  },
  status: {
    type: String,
    enum: ["Chưa hoàn thành", "Hoàn thành"],
    default: "Chưa hoàn thành",
  },

  product_details: [
    {
      id: { type: ObjectId, },
      unit_id: { type: ObjectId, },
      quantity: {
        type: Number,
        require: [true, `Product quantity is required!`],
      },
      input_price: {
        type: Number,
        default: 0,
      },
      note: {
        type: String,
      },
    }
  ],
});

export const OrderFormModel =
  models.OrderForm || model(`OrderForm`, OrderFormSchema);
