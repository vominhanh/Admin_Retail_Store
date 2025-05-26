import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

// Cấu hình MoMo
const config = {
    accessKey: 'F8BBA842ECF85',
    secretKey: 'K951B6PE1waDMi640xX08PD3vg6EkVlz',
    partnerCode: 'MOMO',
    requestType: 'payWithMethod',
    autoCapture: true,
    lang: 'vi',
};

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { orderId, amount, orderInfo, extraData } = body;

        // URL callback
        const host = req.headers.get('host');
        const protocol = host?.includes('localhost') ? 'http' : 'https';

        // Tạo URL callback để MoMo gửi kết quả thanh toán
        const redirectUrl = `${protocol}://${host}/payment/success`;
        const ipnUrl = `${protocol}://${host}/api/payment/momo/callback`;

        // Tạo requestId
        const requestId = orderId || config.partnerCode + new Date().getTime();

        // Tạo chuỗi raw signature
        const rawSignature = [
            `accessKey=${config.accessKey}`,
            `amount=${amount}`,
            `extraData=${extraData || ''}`,
            `ipnUrl=${ipnUrl}`,
            `orderId=${requestId}`,
            `orderInfo=${orderInfo || 'Thanh toán đơn hàng'}`,
            `partnerCode=${config.partnerCode}`,
            `redirectUrl=${redirectUrl}`,
            `requestId=${requestId}`,
            `requestType=${config.requestType}`,
        ].join('&');

        // Tạo chữ ký
        const signature = crypto
            .createHmac('sha256', config.secretKey)
            .update(rawSignature)
            .digest('hex');

        // Tạo request body
        const requestBody = {
            partnerCode: config.partnerCode,
            partnerName: 'Cửa hàng bán lẻ',
            storeId: 'RetailStore',
            requestId: requestId,
            amount: amount,
            orderId: requestId,
            orderInfo: orderInfo || 'Thanh toán đơn hàng',
            redirectUrl: redirectUrl,
            ipnUrl: ipnUrl,
            lang: config.lang,
            requestType: config.requestType,
            autoCapture: config.autoCapture,
            extraData: extraData || '',
            signature: signature,
        };

        // Gửi request đến MoMo
        const response = await fetch('https://test-payment.momo.vn/v2/gateway/api/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Lỗi khi gọi API MoMo: ${response.status} ${errorText}`);
        }

        const responseData = await response.json();
        console.log('Kết quả trả về từ MoMo:', JSON.stringify(responseData, null, 2));
        return NextResponse.json(responseData);
    } catch (error) {
        console.error('Lỗi khi tạo thanh toán MoMo:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Lỗi không xác định' },
            { status: 500 }
        );
    }
} 