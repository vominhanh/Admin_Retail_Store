import { IWarehouseReceipt } from "@/interfaces/warehouse-receipt.interface";

export const DEFAULT_WAREHOUSE_RECEIPT: IWarehouseReceipt = {
  _id: ``,
  supplier_id: ``,
  supplier_receipt_id: ``,
  created_at: new Date(),
  updated_at: new Date(),
  receipt_code: ``,
  product_details: [],
}
