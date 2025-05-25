'use client'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'
import { formatCurrency } from './format-currency'

interface OrderItem {
    product: {
        name: string;
        output_price: number;
    };
    quantity: number;
    batchDetails?: {
        expiryDate: string;
    };
}

interface OrderData {
    orderId: string;
    employeeName: string;
    items: OrderItem[];
    totalAmount: number;
    customerPayment: string;
    changeAmount: string;
    note?: string;
}

const createReceiptHTML = (orderData: OrderData) => {
    const currentDate = new Date();
    const dateStr = currentDate.toLocaleDateString('vi-VN');
    const timeStr = currentDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    return `
        <div id="receipt" style="width: 219px; font-family: 'Segoe UI', Arial, sans-serif; font-size: 9px; padding: 8px;">
            <div style="text-align: center; margin-bottom: 8px;">
                <div style="font-size: 10px;">CỬA HÀNG BÁN LẺ</div>
                <div style="font-size: 9px;">www.cuahangbanle.com</div>
                <div style="font-size: 9px;">32/37 Đường Lê Thị Hồng,</div>
                <div style="font-size: 9px;">Phường 17, Quận Gò Vấp, TP HCM</div>
            </div>

            <div style="text-align: center; font-size: 10px; margin-bottom: 8px;font-weight: bold;">
                PHIẾU THANH TOÁN
            </div>

            <div style="margin-bottom: 8px;">
                <div>SỐ CT: ${orderData.orderId}</div>
                <div>Ngày CT: ${dateStr} ${timeStr}</div>
                <div>Nhân viên: ${orderData.employeeName}</div>
            </div>

            <div style="border-top: 1px dashed #000; margin: 4px 0;"></div>

            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;font-weight: bold;font-size: 10px;">
                <span>Sản phẩm</span>
                <span style="margin-left: 20px;">Giá</span>
                <span style="margin-left: 20px;">Giảm giá</span>
                <span>T.Tiền</span>
            </div>

            <div style="border-top: 1px dashed #000; margin: 4px 0;"></div>

            ${orderData.items.map(item => {
        let isDiscount = false;
        let discountText = '0';
        let price = item.product.output_price;
        let total = price * item.quantity;
        if (item.batchDetails && item.batchDetails.expiryDate) {
            const now = new Date();
            const expiry = new Date(item.batchDetails.expiryDate);
            const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays <= 30) {
                isDiscount = true;
                discountText = '50%';
                price = price * 0.5;
                total = price * item.quantity;
            }
        }
        return `
                    <div style="margin-bottom: 8px;">
                        <div>${item.product.name}</div>
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span>${item.quantity}</span>
                            <span style="margin-left: 12px; display: flex; align-items: center; gap: 3px;">
                              ${isDiscount
                ? `<span style='text-decoration:line-through;color:#bbb;font-size:9px;line-height:1.2;vertical-align:baseline;margin-right:4px;display:inline-block;'>${formatCurrency(item.product.output_price).replace(' ₫', '')}</span><span style='color:#e11d48;font-weight:bold;font-size:10px;vertical-align:baseline;display:inline-block;'>${formatCurrency(price).replace(' ₫', '')}</span>`
                : `<span style='font-size:10px;'>${formatCurrency(item.product.output_price).replace(' ₫', '')}</span>`}
                            </span>
                            <span style="margin-left: 20px;">${discountText}</span>
                            <span>${formatCurrency(total).replace(' ₫', '')}</span>
                        </div>
                    </div>
                `;
    }).join('')}

            <div style="border-top: 1px dashed #000; margin: 4px 0;"></div>

            <div style="margin-bottom: 8px;">
                <div style="display: flex; justify-content: space-between; font-weight: bold;font-size: 10px;">
                    <span>Thành tiền:</span>
                    <span>${formatCurrency(orderData.totalAmount).replace(' ₫', '')}</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-weight: bold;font-size: 10px;">
                    <span>Thanh toán:</span>
                    <span>${formatCurrency(orderData.totalAmount).replace(' ₫', '')}</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-weight: bold;font-size: 10px;">
                    <span>Tiền khách đưa:</span>
                    <span>${formatCurrency(orderData.totalAmount).replace(' ₫', '')}</span>
                </div>
                <div style="display: flex; justify-content: space-between; font-weight: bold;font-size: 10px;">
                    <span>Tiền thối lại:</span>
                    <span>${formatCurrency(Number(orderData.changeAmount.replace(/,/g, ''))).replace(' ₫', '')}</span>
                </div>
            </div>

            <div style="border-top: 1px dashed #000; margin: 4px 0;"></div>

            <div style="text-align: center; font-size: 8px;">
                <div>(Giá trên đã bao gồm thuế GTGT)</div>
                <div style="margin-top: 4px;">
                    Lưu ý: Cửa hàng chỉ xuất hóa đơn trong ngày.</div>
                <div>Quý khách vui lòng liên hệ thu ngân để được hỗ trợ.</div>
            </div>
        </div>
    `;
};

export const generatePDF = async (orderData: OrderData) => {
    // Tạo element tạm thời để render HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = createReceiptHTML(orderData);
    document.body.appendChild(tempDiv);

    try {
        // Chuyển HTML sang canvas
        const canvas = await html2canvas(tempDiv.firstElementChild as HTMLElement, {
            scale: 2,
            useCORS: true,
            logging: false,
            backgroundColor: '#ffffff'
        });

        // Tính toán kích thước PDF dựa trên nội dung
        const pdfWidth = 58; // Chiều rộng cố định của giấy in nhiệt (58mm)
        const contentHeight = canvas.height * (pdfWidth / canvas.width);
        const pdfHeight = contentHeight + 10; // Thêm 10mm margin

        // Tạo PDF với kích thước tự động
        const pdf = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: [pdfWidth, pdfHeight]
        });

        // Chuyển canvas thành ảnh và thêm vào PDF
        const imgData = canvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, contentHeight);

        // Lưu file
        const fileName = `hoa-don-${orderData.orderId || new Date().getTime()}.pdf`;
        pdf.save(fileName);
    } finally {
        // Xóa element tạm
        document.body.removeChild(tempDiv);
    }
}; 