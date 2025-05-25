import { ECollectionNames } from "@/enums";
import { translateCollectionName } from "./translate-collection-name";

/**
 * Tạo tooltip cho nút xem thêm thông tin
 * @param collectionName Tên collection
 * @param lang Ngôn ngữ (mặc định: vn)
 * @returns Tooltip cho nút xem thêm thông tin
 */
export const createMoreInfoTooltip = (
  collectionName: ECollectionNames | string,
  lang: string = 'vn'
): string => {
  const name = translateCollectionName(collectionName, lang).toLowerCase();
  return lang === 'vn'
    ? `Xem thông tin chi tiết ${name}`
    : `Show more information of this ${name}`;
};

/**
 * Tạo tooltip cho nút xóa
 * @param collectionName Tên collection
 * @param lang Ngôn ngữ (mặc định: vn)
 * @returns Tooltip cho nút xóa
 */
export const createDeleteTooltip = (
  collectionName: ECollectionNames | string,
  lang: string = 'vn'
): string => {
  const name = translateCollectionName(collectionName, lang).toLowerCase();
  return lang === 'vn'
    ? `Xóa ${name}`
    : `Delete this ${name}`;
};
