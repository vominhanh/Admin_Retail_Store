import { ObjectId } from 'mongodb';
import { models, model, Schema } from 'mongoose';

const MarketReceiptSchema = new Schema({
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

  product_details: [
    {
      id: { type: ObjectId, }, 
      quantity: {
        type: Number, 
        require: [true, `Product quantity is required!`], 
      }, 
    }
  ], 
});

export const MarketReceiptModel = 
  models.MarketReceipt|| model(`MarketReceipt`, MarketReceiptSchema);
