import { NextResponse } from 'next/server';
import crypto from 'crypto';

const partnerCode = "MOMO";
const accessKey = "F8BBA842ECF85";
const secretkey = "K951B6PE1waDMi640xX08PD3vg6EkVlz";

export async function POST(request: Request) {
    try {
        const { orderId, amount, orderInfo } = await request.json();

        const requestId = partnerCode + new Date().getTime();
        const redirectUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/home/order/payment/callback`;
        const ipnUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/api/payment/momo/ipn`;
        const requestType = "captureWallet";
        const extraData = "";

        const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${orderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`;

        const signature = crypto
            .createHmac('sha256', secretkey)
            .update(rawSignature)
            .digest('hex');

        const requestBody = {
            partnerCode,
            accessKey,
            requestId,
            amount,
            orderId,
            orderInfo,
            redirectUrl,
            ipnUrl,
            extraData,
            requestType,
            signature,
            lang: 'vi'
        };

        const response = await fetch('https://test-payment.momo.vn/v2/gateway/api/create', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody),
        });

        const data = await response.json();

        return NextResponse.json(data);
    } catch (error) {
        console.error('Error creating MoMo payment:', error);
        return NextResponse.json(
            { error: 'Failed to create payment' },
            { status: 500 }
        );
    }
} 