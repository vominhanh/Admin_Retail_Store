/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from 'next/server';
import { StockHistoryModel } from '@/models/StockHistory';
import { connectToDatabase } from '@/utils/database';

export async function GET(req: NextRequest) {
    try {
        await connectToDatabase();
        const { searchParams } = new URL(req.url);
        const query: any = {};
        // Lọc theo product_id
        const product_id = searchParams.get('product_id');
        if (product_id) query.product_id = product_id;
        // Lọc theo action
        const action = searchParams.get('action');
        if (action && action !== 'all') query.action = action;
        // Lọc theo ngày
        const fromDate = searchParams.get('fromDate');
        const toDate = searchParams.get('toDate');
        if (fromDate || toDate) {
            query.created_at = {};
            if (fromDate) query.created_at.$gte = new Date(fromDate);
            if (toDate) query.created_at.$lte = new Date(toDate + 'T23:59:59');
        }
        // Lọc theo search (tên sản phẩm hoặc batch_number)
        // Không join bảng, chỉ lọc theo batch_number
        const search = searchParams.get('search');
        if (search) {
            query.$or = [
                { batch_number: { $regex: search, $options: 'i' } }
            ];
        }
        const histories = await StockHistoryModel.find(query).sort({ created_at: -1 });
        return NextResponse.json(histories || []);
    } catch (error) {
        console.error('Error fetching stock history:', error);
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
        const created = await StockHistoryModel.create(body);
        return NextResponse.json(created, { status: 201 });
    } catch (error) {
        console.error('Error creating stock history:', error);
        return NextResponse.json({ message: 'Lỗi khi lưu lịch sử nhập/xuất kho' }, { status: 500 });
    }
} 