import { ECollectionNames } from "@/enums";
import { getCollections } from "@/services/api-service";
import { ROOT } from "@/constants/root.constant";
import { Dispatch, SetStateAction } from "react";

/**
 * Interface cho các tham số lọc
 */
export interface ICollectionFilters {
  limit?: number;
  offset?: number;
  status?: string | number;
  date?: string;
  productIds?: string;
  unitIds?: string;
  businessIds?: string;
  [key: string]: any;
}

/**
 * Lấy danh sách các collection từ API
 * @param collectionName Tên collection cần lấy dữ liệu
 * @param setCollections State setter để cập nhật dữ liệu (tùy chọn)
 * @param filters Các tham số lọc dữ liệu (tùy chọn)
 * @returns Danh sách các collection
 */
export const fetchGetCollections = async <T>(
  collectionName: ECollectionNames,
  setCollections?: Dispatch<SetStateAction<T[]>>,
  filters?: ICollectionFilters
): Promise<T[]> => {
  try {
    let response: Response;
    let url = `${ROOT}/${collectionName}`;

    // Thêm các tham số lọc vào URL nếu có
    if (filters && Object.keys(filters).length > 0) {
      const queryParams = new URLSearchParams();

      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          queryParams.append(key, String(value));
        }
      });

      const queryString = queryParams.toString();
      if (queryString) {
        url += `?${queryString}`;
      }
    }

    // Ưu tiên sử dụng API service nếu có và không có tham số lọc
    if (typeof getCollections === 'function' && (!filters || Object.keys(filters).length === 0)) {
      response = await getCollections(collectionName);
    } else {
      // Sử dụng fetch trực tiếp khi có tham số lọc
      response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
    }

    if (!response.ok) {
      throw new Error(`Error fetching ${collectionName}: ${response.statusText}`);
    }

    const data: T[] = await response.json();

    // Nếu có setCollections thì cập nhật state
    if (setCollections) {
      setCollections(data);
    }

    return data;
  } catch (error) {
    console.error(`Error fetching ${collectionName}:`, error);
    return [];
  }
};
