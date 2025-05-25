import { IProductDetail } from "@/interfaces/product-detail.interface";

export const DEFAULT_PROCDUCT_DETAIL: IProductDetail = {
  _id: ``,
  created_at: new Date(),
  updated_at: new Date(),

  product_id: ``,
  input_quantity: 0,
  output_quantity: 0,
  inventory: 0,
  date_of_manufacture: new Date(),
  expiry_date: new Date(),
  batch_number: '',
  barcode: '',
}
