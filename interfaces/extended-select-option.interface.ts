import { ISelectOption } from "@/components/select-dropdown/interfaces/select-option.interface";

// Interface mở rộng từ ISelectOption để thêm các trường cần thiết
export interface IExtendedSelectOption extends ISelectOption {
    business_id?: string;
    input_price?: number;
} 