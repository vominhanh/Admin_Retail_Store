import { IOrderFormProductDetail } from "./order-form.interface";

export interface IReceiptProduct {
    _id: string;
    unit_id: string;
    quantity: number;
    note?: string;
}

export interface IWarehouseProductDetail extends IOrderFormProductDetail {
    date_of_manufacture?: string;
    expiry_date?: string;
    batch_number?: string;
    barcode?: string;
    input_price: number;
}

export interface IWarehouseReceipt {
    _id: string;
    supplier_id: string;
    supplier_receipt_id: string;
    created_at: Date;
    updated_at: Date;
    product_details: IWarehouseProductDetail[];
    receipt_code: string;
    user_name?: string;
} 