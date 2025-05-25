export interface IProductDetail {
  _id: string
  created_at: Date
  updated_at: Date

  product_id: string
  product?: string
  batch_number: string
  input_quantity: number
  output_quantity: number
  inventory: number
  date_of_manufacture: Date
  expiry_date: Date
  barcode?: string
}
