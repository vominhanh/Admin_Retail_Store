import { Document } from 'mongoose';

export interface IOrderItem {
    product_id: string;
    quantity: number;
    price: number;
}

export type PaymentMethod = 'cash' | 'transfer' | 'card' | 'momo';
export type OrderStatus = 'pending' | 'completed' | 'cancelled';

export interface IOrder extends Document {
    order_code: string;
    employee_id: string;
    items: IOrderItem[];
    total_amount: number;
    payment_method: PaymentMethod;
    payment_status: boolean;
    status: OrderStatus;
    note?: string;
    created_at: Date;
    updated_at: Date;
    momo_trans_id?: string;
} 