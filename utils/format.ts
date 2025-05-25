/**
 * Định dạng số thành chuỗi tiền tệ
 * @param amount Số tiền cần định dạng
 * @returns Chuỗi tiền tệ đã được định dạng
 */
export const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: 'VND',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}; 