import mongoose, { Schema, Document, Model } from 'mongoose';
import { IReturnExchange } from '@/interfaces/return-exchange.interface';

// Tạo type Document cho Mongoose
export type ReturnExchangeDocument = IReturnExchange & Document;

const ReturnExchangeSchema: Schema = new Schema({
    receipt_id: { type: String, required: true },
    order_id: { type: String, required: true },
    customer_id: { type: String, required: true },
    product_details: { type: Array, required: true },
    action: { type: String, enum: ['exchange', 'return'], required: true },
    created_at: { type: Date, default: Date.now },
    status: { type: String, enum: ['Đang chờ', 'Đang đổi hàng', 'Hoàn thành', 'Đã trả hàng'], default: 'Đang chờ' },
    exchange_info: {
        new_product_id: { type: String },
        new_product_name: { type: String },
        quantity: { type: Number },
        unit: { type: String },
        unit_ratio: { type: Number },
        price: { type: Number },
        additional_payment: { type: Number, default: 0 }
    },
    return_reason: { type: String },
    note: { type: String }
});

const ReturnExchangeModel: Model<ReturnExchangeDocument> =
    mongoose.models.ReturnExchange || mongoose.model<ReturnExchangeDocument>('ReturnExchange', ReturnExchangeSchema);

export default ReturnExchangeModel; 