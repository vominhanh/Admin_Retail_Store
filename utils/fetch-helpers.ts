import { getBusinessNames, getProductsBySupplier } from "@/services/api-service";
import { IBusiness } from "@/interfaces/business.interface";
import { IProduct } from "@/interfaces/product.interface";
import { ISelectOption } from "@/components/select-dropdown/interfaces/select-option.interface";
import { IExtendedSelectOption } from "@/interfaces/extended-select-option.interface";
import { IProductDetail } from "@/interfaces/product-detail.interface";
import { ECollectionNames } from "@/enums";
import { fetchGetCollections } from "./fetch-get-collections";
import { formatCurrency } from "./format-currency";

// Lấy danh sách tên nhà cung cấp cho dropdown
export const fetchBusinessNames = async (): Promise<ISelectOption[]> => {
    try {
        const response = await getBusinessNames();

        if (!response.ok) {
            throw new Error(`Lỗi khi lấy danh sách nhà cung cấp: ${response.statusText}`);
        }

        const businesses: { _id: string; name: string }[] = await response.json();

        return businesses.map((business): ISelectOption => ({
            label: business.name,
            value: business._id,
        }));
    } catch (error) {
        console.error('Lỗi khi lấy danh sách nhà cung cấp:', error);
        return [];
    }
};

// Lấy sản phẩm theo nhà cung cấp và chuyển đổi thành options cho dropdown
export const fetchProductsBySupplier = async (supplierId: string): Promise<IExtendedSelectOption[]> => {
    try {
        if (!supplierId) return [];

        // Lấy sản phẩm theo nhà cung cấp
        const productsResponse = await getProductsBySupplier(supplierId);

        if (!productsResponse.ok) {
            throw new Error(`Lỗi khi lấy sản phẩm: ${productsResponse.statusText}`);
        }

        const products: IProduct[] = await productsResponse.json();

        // Map thành options cho dropdown trực tiếp từ products
        return products.map((product): IExtendedSelectOption => {
            return {
                label: `${product.name}`,
                value: product._id,
                business_id: product.supplier_id,
                input_price: product.input_price
            };
        });
    } catch (error) {
        console.error('Lỗi khi lấy sản phẩm theo nhà cung cấp:', error);
        return [];
    }
}; 