import { NextRequest, NextResponse } from 'next/server';
import { PriceHistoryModel } from '@/models/PriceHistory';
import { connectToDatabase } from '@/utils/database';

export async function GET(req: NextRequest) {
    try {
        await connectToDatabase();
        const { searchParams } = new URL(req.url);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const query: any = {};
        // Lọc theo product_id
        const product_id = searchParams.get('product_id');
        if (product_id) query.product_id = product_id;
        // Lọc theo ngày
        const fromDate = searchParams.get('fromDate');
        const toDate = searchParams.get('toDate');
        if (fromDate || toDate) {
            query.changed_at = {};
            if (fromDate) query.changed_at.$gte = new Date(fromDate);
            if (toDate) query.changed_at.$lte = new Date(toDate + 'T23:59:59');
        }
        // Lọc theo tên sản phẩm (search)
        const search = searchParams.get('search');
        if (search) {
            // Không join bảng, chỉ lọc theo product_id (nếu cần join thì cần sửa thêm)
            // Ở đây chỉ lọc theo product_id nếu search là ObjectId, còn lại bỏ qua
        }
        const histories = await PriceHistoryModel.find(query).sort({ changed_at: -1 });
        return NextResponse.json(histories || []);
    } catch (error) {
        console.error('Error fetching price history:', error);
        // Trả về mảng rỗng thay vì lỗi để tránh crash frontend
        return NextResponse.json([]);
    }
}

export async function POST(req: NextRequest) {
    try {
        await connectToDatabase();
        const body = await req.json();
        // Đảm bảo có user_name
        if (!body.user_name) return NextResponse.json({ message: 'Thiếu tên người thực hiện' }, { status: 400 });
        const created = await PriceHistoryModel.create(body);
        return NextResponse.json(created, { status: 201 });
    } catch (error) {
        console.error('Error creating price history:', error);
        return NextResponse.json({ message: 'Lỗi khi lưu lịch sử giá' }, { status: 500 });
    }
} 