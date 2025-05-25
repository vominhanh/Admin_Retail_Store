/**
 * Tạo số lô (batch number) dựa trên ID sản phẩm và ngày hiện tại
 * Format: PREFIX-YYYYMMDD-RANDOM
 * @param productId ID sản phẩm
 * @returns Số lô được tạo tự động
 */
export function generateBatchNumber(productId: string): string {
    // Kiểm tra nếu productId không tồn tại hoặc rỗng thì trả về giá trị mặc định
    if (!productId) {
        console.warn('ProductID không hợp lệ khi tạo batch number, sử dụng giá trị mặc định');
        return `DEF-${getDateString()}-${getRandomNumber()}`;
    }

    // Lấy tiền tố từ ID sản phẩm (5 ký tự đầu tiên)
    // Lấy 4 ký tự đầu từ ID sản phẩm và thêm 1 ký tự ngẫu nhiên từ A-Z
    const idPrefix = productId.substring(0, 4).toUpperCase();
    const randomChar = String.fromCharCode(65 + Math.floor(Math.random() * 26)); // A-Z
    const prefix = `${idPrefix}${randomChar}`;

    // Lấy ngày hiện tại dưới dạng YYYYMMDD
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateStr = `${year}${month}${day}`;

    // Tạo số ngẫu nhiên 4 chữ số
    const random = getRandomNumber();

    // Kết hợp để tạo batch number
    return `${prefix}-${dateStr}-${random}`;
}

/**
 * Lấy chuỗi ngày tháng theo định dạng YYYYMMDD
 */
function getDateString(): string {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
}

/**
 * Tạo số ngẫu nhiên 4 chữ số
 */
function getRandomNumber(): number {
    return Math.floor(1000 + Math.random() * 9000);
} 