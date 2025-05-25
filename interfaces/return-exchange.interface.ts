export interface IExchangeInfo {
    new_product_id: string;
    new_product_name: string;
    quantity: number;
    unit: string;
    unit_ratio: number;
    price: number;
    additional_payment: number;
}

export interface IReturnExchange {
    _id?: string;
    receipt_id: string;
    order_id: string;
    customer_id: string;
    product_details: any[];
    action: 'exchange' | 'return';
    created_at: Date;
    status: 'Đang chờ' | 'Đang đổi hàng' | 'Hoàn thành' | 'Đã trả hàng';
    exchange_info?: IExchangeInfo;
    return_reason?: string;
    note?: string;
}

export interface IReturnExchangeRequest {
    receipt_id: string;
    order_id: string;
    customer_id: string;
    product_details: any[];
    action: 'exchange' | 'return';
    exchange_info?: IExchangeInfo;
    return_reason?: string;
    note?: string;
}

export interface IReturnExchangeResponse {
    success: boolean;
    data?: IReturnExchange;
    message?: string;
    error?: string;
} 