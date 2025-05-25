/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/no-explicit-any */
'use server';
import { NextRequest, NextResponse } from 'next/server';
import { connectToDatabase } from '@/utils/database';
import { OrderModel } from '@/models/Order';
import { ProductModel } from '@/models/Product';
import mongoose from 'mongoose';

// /api/report/revenue?type=day|month|year|product|category|hour|top_products&date=yyyy-mm-dd&month=yyyy-mm&year=yyyy
export async function GET(req: NextRequest) {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'day';
    const date = searchParams.get('date');
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const productId = searchParams.get('productId');
    const categoryId = searchParams.get('categoryId');
    const limit = searchParams.get('limit') ? parseInt(searchParams.get('limit') || '10') : 10;
    const productName = searchParams.get('productName');
    const fromDate = searchParams.get('fromDate');
    const toDate = searchParams.get('toDate');

    // Chỉ lấy đơn hoàn thành: status === 'completed'/'COMPLETED'
    let match: any = {
        $or: [
            { payment_status: true },
            { status: { $in: ['completed', 'COMPLETED'] } }
        ]
    };

    // Thống kê top sản phẩm bán chạy nhất theo tháng
    if (type === 'top_products' && month) {
        const [y, m] = month.split('-');
        const start = new Date(Number(y), Number(m) - 1, 1);
        const end = new Date(Number(y), Number(m), 0, 23, 59, 59, 999);
        match.created_at = { $gte: start, $lte: end };

        const topProducts = await OrderModel.aggregate([
            { $match: match },
            { $unwind: '$items' },
            {
                $lookup: {
                    from: 'productdetails',
                    localField: 'items.product_detail_id',
                    foreignField: '_id',
                    as: 'productDetail'
                }
            },
            { $unwind: '$productDetail' },
            {
                $lookup: {
                    from: 'products',
                    localField: 'productDetail.product_id',
                    foreignField: '_id',
                    as: 'productInfo'
                }
            },
            { $unwind: '$productInfo' },
            {
                $group: {
                    _id: '$productInfo._id',
                    name: { $first: '$productInfo.name' },
                    totalQuantity: { $sum: '$items.quantity' },
                    totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
                    orderCount: { $sum: 1 }
                }
            },
            { $match: { totalRevenue: { $gt: 0 } } },
            { $sort: { totalRevenue: -1 } },
            { $limit: limit }
        ]);

        return NextResponse.json(topProducts);
    }

    if (type === 'hour' && date) {
        // Lọc đơn hàng trong ngày
        const start = new Date(date + 'T00:00:00.000Z');
        const end = new Date(date + 'T23:59:59.999Z');
        match.created_at = { $gte: start, $lte: end };
        // Lấy doanh thu theo từng giờ
        const revenueByHour = await OrderModel.aggregate([
            { $match: match },
            {
                $group: {
                    _id: { $hour: '$created_at' },
                    totalRevenue: { $sum: '$total_amount' },
                    totalOrders: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ]);
        // Đảm bảo trả về đủ 24 giờ
        const result = Array.from({ length: 24 }, (_, h) => {
            const found = revenueByHour.find((r: any) => r._id === h);
            return {
                _id: h,
                totalRevenue: found ? found.totalRevenue : 0,
                totalOrders: found ? found.totalOrders : 0,
            };
        });
        return NextResponse.json(result);
    }

    // Thống kê doanh thu từng ngày trong tháng
    if (type === 'day' && month) {
        const [y, m] = month.split('-');
        const start = new Date(Number(y), Number(m) - 1, 1);
        const end = new Date(Number(y), Number(m), 0, 23, 59, 59, 999);
        match.created_at = { $gte: start, $lte: end };
        const revenueByDay = await OrderModel.aggregate([
            { $match: match },
            {
                $group: {
                    _id: { $dateToString: { format: '%d/%m/%Y', date: '$created_at' } },
                    totalRevenue: { $sum: '$total_amount' },
                    totalOrders: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ]);

        // Mapping đủ số ngày trong tháng
        const daysInMonth = new Date(Number(y), Number(m), 0).getDate();
        const result = Array.from({ length: daysInMonth }, (_, d) => {
            const day = (d + 1).toString().padStart(2, '0');
            const month = m.toString().padStart(2, '0');
            const label = `${day}/${month}/${y}`;
            const found = revenueByDay.find((r: any) => r._id === label);
            return {
                _id: label,
                totalRevenue: found ? found.totalRevenue : 0,
                totalOrders: found ? found.totalOrders : 0,
            };
        });
        return NextResponse.json(result);
    }

    if (type === 'month' && year) {
        // Thống kê doanh thu cho đủ 12 tháng trong năm
        const start = new Date(Number(year), 0, 1);
        const end = new Date(Number(year), 11, 31, 23, 59, 59, 999);
        match.created_at = { $gte: start, $lte: end };
        const revenueByMonth = await OrderModel.aggregate([
            { $match: match },
            {
                $group: {
                    _id: { $month: '$created_at' },
                    totalRevenue: { $sum: '$total_amount' },
                    totalOrders: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ]);
        // Đảm bảo trả về đủ 12 tháng
        const result = Array.from({ length: 12 }, (_, m) => {
            const found = revenueByMonth.find((r: any) => r._id === m + 1);
            return {
                _id: `${(m + 1).toString().padStart(2, '0')}/${year}`,
                totalRevenue: found ? found.totalRevenue : 0,
                totalOrders: found ? found.totalOrders : 0,
            };
        });
        return NextResponse.json(result);
    }

    if (type === 'day' && date) {
        const start = new Date(date + 'T00:00:00.000Z');
        const end = new Date(date + 'T23:59:59.999Z');
        match.created_at = { $gte: start, $lte: end };
    } else if (type === 'month' && month) {
        const [y, m] = month.split('-');
        const start = new Date(Number(y), Number(m) - 1, 1);
        const end = new Date(Number(y), Number(m), 0, 23, 59, 59, 999);
        match.created_at = { $gte: start, $lte: end };
    } else if (type === 'year' && year) {
        const start = new Date(Number(year), 0, 1);
        const end = new Date(Number(year), 11, 31, 23, 59, 59, 999);
        match.created_at = { $gte: start, $lte: end };
    }

    // Nếu có productName mà không có productId thì tìm productId
    let resolvedProductId = productId;
    if (!productId && productName) {
        const product = await ProductModel.findOne({ name: productName });
        if (product) {
            resolvedProductId = product._id.toString();
        }
    }

    // Thống kê theo sản phẩm (product)
    if (type === 'product' && productId && fromDate && toDate) {
        match.created_at = { $gte: new Date(fromDate), $lte: new Date(toDate) };
        const reportOrder = await OrderModel.aggregate([
            { $match: match },
            { $unwind: '$items' },
            { $match: { 'items.product_id': new mongoose.Types.ObjectId(productId) } },
            {
                $group: {
                    _id: { $dateToString: { format: '%d/%m/%Y', date: '$created_at' } },
                    totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
                    totalOrders: { $sum: 1 },
                    totalQuantity: { $sum: '$items.quantity' }
                }
            },
            { $sort: { _id: 1 } }
        ]);
        return NextResponse.json(reportOrder);
    }
    // Thống kê theo sản phẩm theo tháng
    if (type === 'product' && productId && month) {
        const [y, m] = month.split('-');
        const start = new Date(Number(y), Number(m) - 1, 1);
        const end = new Date(Number(y), Number(m), 0, 23, 59, 59, 999);
        match.created_at = { $gte: start, $lte: end };
        const reportOrder = await OrderModel.aggregate([
            { $match: match },
            { $unwind: '$items' },
            { $match: { 'items.product_id': new mongoose.Types.ObjectId(productId) } },
            {
                $group: {
                    _id: { $dateToString: { format: '%d', date: '$created_at' } },
                    totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
                    totalOrders: { $sum: 1 },
                    totalQuantity: { $sum: '$items.quantity' }
                }
            },
            { $sort: { _id: 1 } }
        ]);
        return NextResponse.json(reportOrder);
    }
    // Thống kê tổng hợp theo sản phẩm
    if (type === 'product' && !fromDate && !toDate && !month) {
        const reportOrder = await OrderModel.aggregate([
            { $match: match },
            { $unwind: '$items' },
            {
                $group: {
                    _id: '$items.product_id',
                    totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
                    totalOrders: { $sum: 1 },
                    totalQuantity: { $sum: '$items.quantity' }
                }
            },
            { $sort: { totalRevenue: -1 } }
        ]);
        return NextResponse.json(reportOrder);
    }

    // Thống kê doanh thu từng tháng trong năm cho 1 sản phẩm
    if (type === 'product' && productId && year) {
        const start = new Date(Number(year), 0, 1);
        const end = new Date(Number(year), 11, 31, 23, 59, 59, 999);
        match.created_at = { $gte: start, $lte: end };

        const revenueByMonth = await OrderModel.aggregate([
            { $match: match },
            { $unwind: '$items' },
            {
                $lookup: {
                    from: 'products',
                    localField: 'items.product_id',
                    foreignField: '_id',
                    as: 'productInfo'
                }
            },
            { $unwind: '$productInfo' },
            { $match: { 'productInfo._id': new mongoose.Types.ObjectId(productId) } },
            {
                $group: {
                    _id: { $month: '$created_at' },
                    totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
                    totalOrders: { $sum: 1 },
                },
            },
            { $sort: { _id: 1 } },
        ]);

        // Mapping đủ 12 tháng
        const result = Array.from({ length: 12 }, (_, m) => {
            const found = revenueByMonth.find((r: any) => r._id === m + 1);
            return {
                _id: (m + 1).toString().padStart(2, '0'),
                totalRevenue: found ? found.totalRevenue : 0,
                totalOrders: found ? found.totalOrders : 0,
            };
        });
        return NextResponse.json(result);
    }

    // Thống kê theo loại sản phẩm (category) theo khoảng ngày
    if (type === 'category' && categoryId && fromDate && toDate) {
        match.created_at = { $gte: new Date(fromDate), $lte: new Date(toDate) };
        const reportOrder = await OrderModel.aggregate([
            { $match: match },
            { $unwind: '$items' },
            {
                $lookup: {
                    from: 'products',
                    localField: 'items.product_id',
                    foreignField: '_id',
                    as: 'productInfo'
                }
            },
            { $unwind: '$productInfo' },
            { $match: { 'productInfo.category_id': new mongoose.Types.ObjectId(categoryId) } },
            {
                $group: {
                    _id: { $dateToString: { format: '%d/%m/%Y', date: '$created_at' } },
                    totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
                    totalOrders: { $sum: 1 },
                    totalQuantity: { $sum: '$items.quantity' }
                }
            },
            { $sort: { _id: 1 } }
        ]);
        return NextResponse.json(reportOrder);
    }
    // Thống kê theo loại sản phẩm theo tháng
    if (type === 'category' && categoryId && month) {
        const [y, m] = month.split('-');
        const start = new Date(Number(y), Number(m) - 1, 1);
        const end = new Date(Number(y), Number(m), 0, 23, 59, 59, 999);
        match.created_at = { $gte: start, $lte: end };
        const reportOrder = await OrderModel.aggregate([
            { $match: match },
            { $unwind: '$items' },
            {
                $lookup: {
                    from: 'products',
                    localField: 'items.product_id',
                    foreignField: '_id',
                    as: 'productInfo'
                }
            },
            { $unwind: '$productInfo' },
            { $match: { 'productInfo.category_id': new mongoose.Types.ObjectId(categoryId) } },
            {
                $group: {
                    _id: { $dateToString: { format: '%d', date: '$created_at' } },
                    totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
                    totalOrders: { $sum: 1 },
                    totalQuantity: { $sum: '$items.quantity' }
                }
            },
            { $sort: { _id: 1 } }
        ]);
        return NextResponse.json(reportOrder);
    }
    // Thống kê tổng hợp theo loại sản phẩm
    if (type === 'category' && !fromDate && !toDate && !month) {
        const reportOrder = await OrderModel.aggregate([
            { $match: match },
            { $unwind: '$items' },
            {
                $lookup: {
                    from: 'products',
                    localField: 'items.product_id',
                    foreignField: '_id',
                    as: 'productInfo'
                }
            },
            { $unwind: '$productInfo' },
            {
                $group: {
                    _id: '$productInfo.category_id',
                    totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
                    totalOrders: { $sum: 1 },
                    totalQuantity: { $sum: '$items.quantity' }
                }
            },
            { $sort: { totalRevenue: -1 } }
        ]);
        return NextResponse.json(reportOrder);
    }

    // Thống kê doanh thu tổng hợp theo ngày/tháng/năm
    const groupBy =
        type === 'day'
            ? { $dateToString: { format: '%d/%m/%Y', date: '$created_at' } }
            : type === 'month'
                ? { $dateToString: { format: '%m/%Y', date: '$created_at' } }
                : { $dateToString: { format: '%Y', date: '$created_at' } };

    const revenue = await OrderModel.aggregate([
        { $match: match },
        {
            $group: {
                _id: groupBy,
                totalRevenue: { $sum: '$total_amount' },
                totalOrders: { $sum: 1 },
            },
        },
        { $sort: { _id: 1 } },
    ]);

    return NextResponse.json(revenue);
} 