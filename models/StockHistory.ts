import { ObjectId } from 'mongodb';
import { models, model, Schema } from 'mongoose';

const StockHistorySchema = new Schema({
    product_id: { type: ObjectId, required: true },
    batch_number: { type: String },
    action: { type: String, enum: ['import', 'export', 'return', 'exchange'], required: true },
    quantity: { type: Number, required: true },
    related_receipt_id: { type: ObjectId }, // phiếu nhập/xuất liên quan
    note: { type: String },
    created_at: { type: Date, default: () => Date.now() },
    user_id: { type: ObjectId }, // ai thao tác
    user_name: { type: String, required: true }, // tên người thao tác
});

export const StockHistoryModel = models.StockHistory || model('StockHistory', StockHistorySchema); 