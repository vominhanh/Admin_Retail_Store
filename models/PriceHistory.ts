import { ObjectId } from 'mongodb';
import { models, model, Schema } from 'mongoose';

const PriceHistorySchema = new Schema({
    product_id: { type: ObjectId, required: true },
    old_input_price: { type: Number, required: true },
    new_input_price: { type: Number, required: true },
    old_output_price: { type: Number, required: true },
    new_output_price: { type: Number, required: true },
    changed_at: { type: Date, default: () => Date.now() },
    user_id: { type: ObjectId }, // ai thao tác
    user_name: { type: String, required: true }, // tên người thao tác
    note: { type: String },
});

export const PriceHistoryModel = models.PriceHistory || model('PriceHistory', PriceHistorySchema);
