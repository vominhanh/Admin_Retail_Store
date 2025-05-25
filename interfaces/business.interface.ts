
export interface IBusiness {
  type: string
  _id: string
  created_at: Date
  updated_at: Date

  name: string
  logo?: string
  logo_links?: string[]
  address: string
  email: string
  phone?: string
}
