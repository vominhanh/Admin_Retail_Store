import { IProduct } from "@/interfaces/product.interface";
import { nameToHyphenAndLowercase } from "@/utils/name-to-hyphen-and-lowercase";

// Thêm đường dẫn mặc định cho hình ảnh sản phẩm
const DEFAULT_IMAGE_PATH = "/images/default_product.png";

export const DEFAULT_PROCDUCT: IProduct = {
  _id: ``,
  created_at: new Date(),
  updated_at: new Date(),

  supplier_id: ``,
  name: ``,
  description: ``,
  image_links: [DEFAULT_IMAGE_PATH], // Sử dụng hình ảnh mặc định
  input_price: 0,
  output_price: 0,
  category_id: "",
  code: ""
}
