import mongoose from 'mongoose';
import { IOrder } from '@/interfaces/order.interface';

const orderSchema = new mongoose.Schema({
    order_code: {
        type: String,
        required: true,
        unique: true
    },
    employee_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    items: [{
        product_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        quantity: {
            type: Number,
            required: true,
            min: 1
        },
        price: {
            type: Number,
            required: true,
            min: 0
        }
    }],
    total_amount: {
        type: Number,
        required: true,
        min: 0
    },
    payment_method: {
        type: String,
        enum: ['cash', 'transfer', 'card'],
        default: 'cash'
    },
    payment_status: {
        type: Boolean,
        default: false
    },
    status: {
        type: String,
        enum: ['pending', 'completed', 'cancelled'],
        default: 'pending'
    },
    note: String,
    created_at: {
        type: Date,
        default: Date.now
    },
    updated_at: {
        type: Date,
        default: Date.now
    }
});

// Middleware để tự động cập nhật updated_at
orderSchema.pre('save', function (next) {
    this.updated_at = new Date();
    next();
});



export const OrderModel = mongoose.models.Order || mongoose.model<IOrder>('Order', orderSchema); 