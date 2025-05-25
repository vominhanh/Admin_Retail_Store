export enum OrderFormStatus {
  PENDING = "Chưa hoàn thành",
  COMPLETED = "Hoàn thành"
}

export interface IOrderFormProductDetail {
  _id: string
  unit_id: string
  quantity: number
  note?: string
  input_price?: number
}

export interface IOrderForm {
  _id: string
  supplier_id: string
  created_at: Date
  updated_at: Date
  status: OrderFormStatus

  product_details: IOrderFormProductDetail[]
}
