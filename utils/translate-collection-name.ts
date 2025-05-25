import { ECollectionNames } from "@/enums";

/**
 * Dịch tên collection sang ngôn ngữ cần thiết
 * @param collectionName Tên collection cần dịch
 * @param lang Ngôn ngữ muốn dịch sang (mặc định: vn)
 * @returns Tên collection đã được dịch
 */
export const translateCollectionName = (
  collectionName: ECollectionNames | string,
  lang: string = 'vn'
): string => {
  switch (lang) {
    case 'vn':
      switch (collectionName) {
        case ECollectionNames.ACCOUNT:
          return 'tài khoản';
        case ECollectionNames.ORDER_FORM:
          return 'phiếu đặt hàng';
        case ECollectionNames.SUPPLIER_RECEIPT:
          return 'phiếu nhập kho của nhà cung cấp';
        case ECollectionNames.PRODUCT:
          return 'Thông tin sản phẩm';
        case ECollectionNames.PRODUCT_DETAIL:
          return 'báo cáo tồn kho';
        case ECollectionNames.BUSINESS:
          return 'nhà cung cấp';
        case ECollectionNames.UNIT:
          return 'đơn vị tính';
        case ECollectionNames.USER:
          return 'nhân viên';
        case ECollectionNames.WAREHOUSE_RECEIPT:
          return 'phiếu nhập kho';
        case ECollectionNames.CUSTOMER:
          return 'khách hàng';
        case ECollectionNames.RECEIPT:
          return 'hóa đơn';
        case ECollectionNames.CATEGORY:
          return 'danh mục';
        default:
          return typeof collectionName === 'string' ? collectionName : '';
      }
    case 'en':
      switch (collectionName) {
        case ECollectionNames.ACCOUNT:
          return 'Account';
        case ECollectionNames.ORDER_FORM:
          return 'Order Form';
        case ECollectionNames.PRODUCT:
          return 'Product';
        case ECollectionNames.PRODUCT_DETAIL:
          return 'Product Detail';
        case ECollectionNames.BUSINESS:
          return 'Business';
        case ECollectionNames.UNIT:
          return 'Unit';
        case ECollectionNames.WAREHOUSE_RECEIPT:
          return 'Warehouse Receipt';
        default:
          return typeof collectionName === 'string' ? collectionName : '';
      }
    default:
      return typeof collectionName === 'string' ? collectionName : '';
  }
};
