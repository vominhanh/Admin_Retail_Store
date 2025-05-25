import { IOrderForm, OrderFormStatus } from "@/interfaces/order-form.interface";

export const DEFAULT_ORDER_FORM: IOrderForm = {
  _id: ``,
  supplier_id: ``,
  created_at: new Date(),
  updated_at: new Date(),
  status: OrderFormStatus.PENDING,

  product_details: [],
}
