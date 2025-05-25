export interface IOrderItem {
    product_id: string;
    quantity: number;
    price: number;
}

export interface IOrder {
    _id: string;
    order_code: string;
    employee_id: string;
    items: IOrderItem[];
    total_amount: number;
    payment_method: string;
    payment_status: boolean;
    note?: string;
    created_at: Date;
    updated_at: Date;
} 