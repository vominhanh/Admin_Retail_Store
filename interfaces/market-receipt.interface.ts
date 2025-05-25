import { IReceiptProduct } from "./warehouse-receipt.interface"

export interface IMarketReceipt {
  _id: string
  created_at: Date
  updated_at: Date

  product_details: IReceiptProduct[], 
}
