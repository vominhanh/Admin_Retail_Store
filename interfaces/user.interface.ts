import { IUserName } from "./user-name.interface";
import { IUserAddress } from "./user-address.interface";

export interface IUser {
  _id?: string
  created_at?: Date
  updated_at?: Date

  account_id?: string
  name: string
  address: string
  email?: string
  birthday?: Date
  gender?: string
  avatar?: string
  position?: string
}
