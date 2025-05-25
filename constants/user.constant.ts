import { EUserGender } from "@/enums/user-gender.enum";
import { IUser } from "@/interfaces";

export const DEFAULT_USER: IUser = {
  _id: ``,
  created_at: new Date(),
  updated_at: new Date(),

  account_id: ``,
  name: "",
  address: "",
  email: "",
  birthday: undefined,
  gender: EUserGender.MALE,
  avatar: ``,
  position: ""
}
