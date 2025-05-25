import { IOrderFormProductDetail } from "./order-form.interface"

export interface ISupplierReceipt {
  _id: string
  order_form_id: string
  created_at: Date
  updated_at: Date

  product_details: IOrderFormProductDetail[]
}
