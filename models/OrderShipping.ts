import mongoose from 'mongoose';

export enum ShippingStatus {
    PENDING = 'pending',      // Chờ xác nhận
    CONFIRMED = 'confirmed',  // Đã xác nhận
    SHIPPING = 'shipping',    // Đang giao hàng
    DELIVERED = 'delivered',  // Đã giao hàng
    CANCELLED = 'cancelled'   // Đã hủy
}

const OrderShippingSchema = new mongoose.Schema({
    order_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order',
        required: [true, 'ID đơn hàng là bắt buộc!']
    },
    customer_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer'
    },
    customer_name: {
        type: String,
        required: [true, 'Tên người nhận là bắt buộc!'],
        trim: true
    },
    customer_phone: {
        type: String,
        required: [true, 'Số điện thoại người nhận là bắt buộc!'],
        trim: true,
        validate: {
            validator: function (value: string) {
                return /^(0|\+84)[0-9]{9,10}$/.test(value);
            },
            message: 'Số điện thoại không hợp lệ!'
        }
    },
    shipping_address: {
        type: String,
        required: [true, 'Địa chỉ giao hàng là bắt buộc!'],
        trim: true
    },
    status: {
        type: String,
        enum: Object.values(ShippingStatus),
        default: ShippingStatus.PENDING
    },
    shipping_fee: {
        type: Number,
        required: [true, 'Phí vận chuyển là bắt buộc!'],
        min: [0, 'Phí vận chuyển không được âm!']
    },
    shipping_notes: {
        type: String,
        trim: true
    },
    created_at: {
        type: Date,
        default: () => Date.now(),
        immutable: true
    },
    updated_at: {
        type: Date,
        default: () => Date.now()
    }
});

// Tự động cập nhật thời gian sửa đổi
OrderShippingSchema.pre('save', function (next) {
    this.updated_at = new Date();
    next();
});

export const OrderShippingModel = mongoose.models.OrderShipping || mongoose.model('OrderShipping', OrderShippingSchema); 