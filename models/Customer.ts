import { ObjectId } from 'mongodb';
import { models, model, Schema, CallbackWithoutResultAndOptionalError } from 'mongoose';
import bcrypt from 'bcryptjs';

const CustomerSchema = new Schema({
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
        required: [true, 'Tên khách hàng là bắt buộc!'],
        trim: true,
    },
    email: {
        type: String,
        required: [true, 'Email là bắt buộc!'],
        unique: true,
        trim: true,
        lowercase: true,
        validate: {
            validator: function (value: string) {
                return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
            },
            message: 'Email không hợp lệ!'
        }
    },
    password: {
        type: String,
        required: [true, 'Mật khẩu là bắt buộc!'],
        minlength: [6, 'Mật khẩu phải có ít nhất 6 ký tự!']
    },
    phone: {
        type: String,
        trim: true,
        validate: {
            validator: function (value: string) {
                return !value || /^(0|\+84)[0-9]{9,10}$/.test(value);
            },
            message: 'Số điện thoại không hợp lệ!'
        }
    },
    address: {
        type: String,
        trim: true,
    },
    avatar: {
        type: String,
    },
    orders: {
        type: [{ type: ObjectId, ref: 'Order' }],
        default: []
    },
    is_active: {
        type: Boolean,
        default: true
    },
    is_verified: {
        type: Boolean,
        default: false
    },
    verification_token: {
        type: String
    },
    verification_token_expires: {
        type: Date
    },
    otp: {
        code: {
            type: String
        },
        expires_at: {
            type: Date
        }
    },
    last_login: {
        type: Date
    }
});

// Hash mật khẩu trước khi lưu
CustomerSchema.pre('save', async function (next: CallbackWithoutResultAndOptionalError) {
    // Chỉ hash mật khẩu nếu nó được sửa đổi (hoặc mới)
    if (!this.isModified('password')) return next();

    try {
        // Tạo salt và hash mật khẩu
        const salt = await bcrypt.genSalt(10);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error: any) {
        next(error);
    }
});

// Phương thức kiểm tra mật khẩu
CustomerSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.password);
};

// Tự động cập nhật thời gian sửa đổi
CustomerSchema.pre('save', function (next) {
    this.updated_at = new Date();
    next();
});

export const CustomerModel = models.Customer || model('Customer', CustomerSchema); 