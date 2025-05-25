import { ICategory } from "@/interfaces/category.interface";
import { IUnit } from "@/interfaces/unit.interface";

export const DEFAULT_CATEGORY: ICategory = {
  _id: '',
  created_at: new Date(),
  updated_at: new Date(),
  name: '',
  code: '',
  discount: 0
}
