import { NextResponse } from 'next/server';
import { CustomerModel } from '@/models/Customer';
import { connectToDatabase } from '@/utils/database';

export async function GET() {
    try {
        await connectToDatabase();

        const customers = await CustomerModel.find({})
            .select('-password -verification_token -verification_token_expires -otp') // Loại bỏ các trường nhạy cảm
            .sort({ created_at: -1 }); // Sắp xếp theo thời gian tạo mới nhất

        return NextResponse.json(customers);
    } catch (error) {
        console.error('Lỗi khi lấy danh sách khách hàng:', error);
        return NextResponse.json(
            { error: 'Lỗi khi lấy danh sách khách hàng' },
            { status: 500 }
        );
    }
} 